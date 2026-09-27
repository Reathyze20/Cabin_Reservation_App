#!/usr/bin/env bash
# Server-side deploy for one target (docs/plans/SEP-1-deploy.md §4.1–4.2).
#
# Required env:
#   DEPLOY_TARGET   production | staging
#   APP_PATH        app directory on the server (contains .env)
#   PM2_NAME        pm2 process name
#   APP_PORT        port the app listens on (must match PORT in .env)
#   SOURCE_REF      git ref the bundle was built from (github.ref)
#   RELEASE_BUNDLE  path to the uploaded release.tgz
#
# The guards run before anything on the server is touched.
# For now only DEPLOY_TARGET=staging is wired up. Family production keeps
# deploying through the inline script in deploy.yml on rodina-stable until
# SEP-1 B4 moves it here (together with the production-only legacy migration
# repairs and the backup cron).
set -euo pipefail

fail() { echo "DEPLOY GUARD: $*" >&2; exit 1; }

: "${DEPLOY_TARGET:?}" "${APP_PATH:?}" "${PM2_NAME:?}" "${APP_PORT:?}" "${SOURCE_REF:?}" "${RELEASE_BUNDLE:?}"

PRODUCTION_APP_PATH="/home/reathyze/chata"

# ── Guards ─────────────────────────────────────────────────────────────
case "$DEPLOY_TARGET" in
  production)
    fail "production still deploys via deploy.yml on rodina-stable (SEP-1 B4 moves it here)" ;;
  staging)
    [ "$SOURCE_REF" = "refs/heads/main" ] || fail "staging accepts only main (got $SOURCE_REF)"
    [ "$(realpath -m "$APP_PATH")" != "$PRODUCTION_APP_PATH" ] || fail "staging must not use the production directory"
    [ "$APP_PORT" != "3000" ] || fail "staging must not use the production port 3000"
    [ "$PM2_NAME" != "chata-app" ] || fail "staging must not use the production pm2 process"
    ;;
  *) fail "unknown DEPLOY_TARGET '$DEPLOY_TARGET'" ;;
esac

[ -d "$APP_PATH" ] || fail "$APP_PATH does not exist"
[ -f "$APP_PATH/.env" ] || fail "$APP_PATH/.env is missing (create it from .env.$DEPLOY_TARGET.example)"
[ -f "$RELEASE_BUNDLE" ] || fail "release bundle $RELEASE_BUNDLE was not uploaded"

env_value() { sed -n "s/^$1=//p" "$APP_PATH/.env" | tail -n 1 | tr -d '"' | tr -d "'" | tr -d '[:space:]'; }

[ "$(env_value DEPLOY_TARGET)" = "$DEPLOY_TARGET" ] \
  || fail ".env in $APP_PATH must contain DEPLOY_TARGET=$DEPLOY_TARGET"
[ "$(env_value PORT)" = "$APP_PORT" ] || fail "PORT in .env must be $APP_PORT"

if [ "$DEPLOY_TARGET" = "staging" ]; then
  db_name=$(env_value DATABASE_URL | sed -E 's#^[^/]*//[^/]*/([^?]*).*#\1#')
  case "$db_name" in
    *_staging) ;;
    *) fail "staging DATABASE_URL must point to a database ending in _staging (got '$db_name')" ;;
  esac
fi

FRONTEND_URL_VALUE=$(env_value FRONTEND_URL)
case "$FRONTEND_URL_VALUE" in
  ""|http://localhost*|https://localhost*|http://127.0.0.1*|https://127.0.0.1*|http://\[::1\]*|https://\[::1\]*)
    fail "FRONTEND_URL in .env is missing or points to localhost" ;;
esac

echo "Guards passed: target=$DEPLOY_TARGET ref=$SOURCE_REF path=$APP_PATH pm2=$PM2_NAME port=$APP_PORT"

# ── Deploy ─────────────────────────────────────────────────────────────
export NVM_DIR="/home/reathyze/.nvm"
export PM2_HOME="/home/reathyze/.pm2"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

trap 'echo "=== DEPLOY FAILED: [$BASH_COMMAND] exited with $? at line $LINENO ==="; npx pm2 restart "$PM2_NAME" 2>/dev/null || true' ERR

DATA_BACKUP="/tmp/${PM2_NAME}_data_backup"
RELEASE_DIR="/tmp/${PM2_NAME}-release"

cd "$APP_PATH"

echo "=== Backing up data ==="
rm -rf "$DATA_BACKUP" && mkdir -p "$DATA_BACKUP"
cp .env "$DATA_BACKUP/.env"
[ -d data/uploads ] && cp -R data/uploads "$DATA_BACKUP/"
[ -d data/logs ] && cp -R data/logs "$DATA_BACKUP/"

echo "=== Updating code ==="
rm -rf "$RELEASE_DIR" && mkdir -p "$RELEASE_DIR"
tar -xzf "$RELEASE_BUNDLE" -C "$RELEASE_DIR"
rm -rf node_modules.old.* frontend-v2/node_modules.old.* dist.old.* src/generated/prisma.old.* 2>/dev/null || true
rsync -a --delete \
  --exclude '/data' --exclude '/.env' --exclude '/node_modules' --exclude '/frontend-v2/node_modules' \
  --exclude '/dist' --exclude '/src/generated' --exclude '*.old.*' \
  "$RELEASE_DIR"/ "$APP_PATH"/
rm -rf "$RELEASE_DIR" "$RELEASE_BUNDLE"

echo "=== Restoring data ==="
cp "$DATA_BACKUP/.env" .env
for dir in uploads logs; do
  if [ -d "$DATA_BACKUP/$dir" ]; then
    rm -rf "data/$dir" && mkdir -p "data/$dir" && cp -rT "$DATA_BACKUP/$dir" "data/$dir"
  fi
done
rm -rf "$DATA_BACKUP"

echo "=== Installing dependencies ==="
[ -d node_modules ] && mv node_modules "node_modules.old.$(date +%s)"
npm ci
npm rebuild

echo "=== Stopping application ==="
npx pm2 stop "$PM2_NAME" 2>/dev/null || true

echo "=== Generating Prisma client ==="
if [ -d src/generated/prisma ]; then
  chmod -R u+rw src/generated/prisma 2>/dev/null || true
  mv src/generated/prisma "src/generated/prisma.old.$(date +%s)" 2>/dev/null || rm -rf src/generated/prisma
fi
rm -rf src/generated/prisma.old.* 2>/dev/null || true
npx prisma generate

echo "=== Running database migrations ==="
sed -i '1s/^\xEF\xBB\xBF//' .env
while IFS= read -r line || [ -n "$line" ]; do
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  line="${line%%#*}"
  line="${line%"${line##*[![:space:]]}"}"
  if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
    export "$line"
  fi
done < .env
[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL is empty after loading .env"
npx prisma migrate deploy

echo "=== Building frontend ==="
if [ -d dist ]; then
  chmod -R u+rw dist 2>/dev/null || true
  mv dist "dist.old.$(date +%s)" 2>/dev/null || rm -rf dist
fi
rm -rf dist.old.* 2>/dev/null || true
[ -d frontend-v2/node_modules ] && mv frontend-v2/node_modules "frontend-v2/node_modules.old.$(date +%s)"
(cd frontend-v2 && npm ci)
npm run build

echo "=== Restarting application ==="
fuser -k "${APP_PORT}/tcp" 2>/dev/null || true
sleep 1
npx pm2 restart "$PM2_NAME" 2>/dev/null || npx pm2 start npm --name "$PM2_NAME" -- run start
npx pm2 save

echo "Waiting for health check on port $APP_PORT..."
for i in $(seq 1 20); do
  if curl -fsS "http://localhost:${APP_PORT}/api/health" | grep -q '"status":"ok"'; then
    echo "Server is healthy after $((i * 3))s"
    exit 0
  fi
  sleep 3
done
fail "/api/health on port $APP_PORT did not return status ok in time"
