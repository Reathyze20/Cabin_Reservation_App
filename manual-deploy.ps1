# Manual deployment script
# Uses a release bundle upload, so it does not depend on git auth on the server.
# Run: .\manual-deploy.ps1

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$server = 'root@89.221.217.81'
$releaseBundle = Join-Path $repoRoot 'release.tgz'

Push-Location $repoRoot

try {
	if (Test-Path $releaseBundle) {
		Remove-Item $releaseBundle -Force
	}

	Write-Host '=== Packaging release bundle ==='
	& tar `
		--exclude=.git `
		--exclude=.github `
		--exclude=.env `
		--exclude=release.tgz `
		--exclude=node_modules `
		--exclude=frontend-v2/node_modules `
		--exclude=dist `
		--exclude=data `
		--exclude=src/generated/prisma `
		-czf $releaseBundle `
		.

	if ($LASTEXITCODE -ne 0) {
		throw 'Failed to package release bundle.'
	}

	Write-Host '=== Uploading release bundle ==='
	& scp $releaseBundle "${server}:/tmp/release.tgz"

	if ($LASTEXITCODE -ne 0) {
		throw 'Failed to upload release bundle.'
	}

	$commands = @'
set -e

export NVM_DIR="/home/reathyze/.nvm"
export PM2_HOME="/home/reathyze/.pm2"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

APP_PATH="/home/reathyze/chata"
RELEASE_BUNDLE="/tmp/release.tgz"
RELEASE_DIR="/tmp/chata-release"

cd "$APP_PATH"

echo "=== Validating environment ==="
if [ ! -f ".env" ]; then
	echo "ERROR: .env file is missing in $APP_PATH"
	exit 1
fi

FRONTEND_URL_VALUE=$(sed -n 's/^FRONTEND_URL=//p' .env | tail -n 1 | tr -d '"' | tr -d "'" | tr -d '[:space:]')
if [ -z "$FRONTEND_URL_VALUE" ]; then
	echo "ERROR: FRONTEND_URL is missing in .env"
	exit 1
fi

case "$FRONTEND_URL_VALUE" in
	http://localhost*|https://localhost*|http://127.0.0.1*|https://127.0.0.1*|http://::1*|https://::1*|http://[::1]*|https://[::1]*)
		echo "ERROR: FRONTEND_URL points to localhost and is not valid for production."
		exit 1
		;;
esac

echo "FRONTEND_URL validated: $FRONTEND_URL_VALUE"

echo "=== Cleaning persistent data quirks ==="
if [ -d "data/uploads/uploads" ]; then
	rm -rf data/uploads/uploads
fi
if [ -d "data/logs/logs" ]; then
	rm -rf data/logs/logs
fi

echo "=== Syncing release bundle ==="
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
tar -xzf "$RELEASE_BUNDLE" -C "$RELEASE_DIR"

if command -v rsync >/dev/null 2>&1; then
	rsync -a --delete \
		--exclude 'data' \
		--exclude '.env' \
		--exclude 'node_modules' \
		--exclude 'frontend-v2/node_modules' \
		--exclude 'dist' \
		--exclude 'src/generated/prisma' \
		"$RELEASE_DIR"/ "$APP_PATH"/
else
	echo "WARNING: rsync not found. Falling back to archive overlay without delete semantics."
	tar -xzf "$RELEASE_BUNDLE" -C "$APP_PATH"
fi

rm -rf "$RELEASE_DIR"
rm -f "$RELEASE_BUNDLE"

echo "=== Installing dependencies ==="
rm -rf node_modules.old.* 2>/dev/null || true
if [ -d "node_modules" ]; then
	mv node_modules node_modules.old.$(date +%s)
fi
npm ci
npm rebuild

echo "=== Stopping application ==="
npx pm2 stop chata-app 2>/dev/null || true

echo "=== Generating Prisma client ==="
if [ -d "src/generated/prisma" ]; then
	chmod -R u+rw src/generated/prisma 2>/dev/null || true
	mv src/generated/prisma src/generated/prisma.old.$(date +%s) 2>/dev/null || rm -rf src/generated/prisma 2>/dev/null || true
fi
rm -rf src/generated/prisma.old.* 2>/dev/null || true
npx prisma generate

echo "=== Running database migrations ==="
npx prisma migrate deploy

echo "=== Cleaning dist directory ==="
if [ -d "dist" ]; then
	chmod -R u+rw dist 2>/dev/null || true
	mv dist dist.old.$(date +%s) 2>/dev/null || rm -rf dist 2>/dev/null || true
fi
rm -rf dist.old.* 2>/dev/null || true

echo "=== Installing frontend dependencies ==="
rm -rf frontend-v2/node_modules.old.* 2>/dev/null || true
if [ -d "frontend-v2/node_modules" ]; then
	mv frontend-v2/node_modules frontend-v2/node_modules.old.$(date +%s)
fi
cd frontend-v2 && npm ci && cd ..

echo "=== Building frontend ==="
npm run build

echo "=== Restarting application ==="
fuser -k 3000/tcp 2>/dev/null || true
npx pm2 restart chata-app 2>/dev/null || npx pm2 start npm --name "chata-app" -- run start
npx pm2 save

echo "=== Waiting for health check ==="
SERVER_READY=0
for i in $(seq 1 20); do
	if curl -fsS http://localhost:3000/api/health | grep -q '"status":"ok"'; then
		echo "Server is healthy after $((i * 3))s"
		SERVER_READY=1
		break
	fi
	echo "  ...waiting (${i}/20)"
	sleep 3
done

if [ "$SERVER_READY" -ne 1 ]; then
	echo "ERROR: /api/health did not return status ok in time"
	exit 1
fi

echo "=== Done ==="
'@

	Write-Host '=== Executing remote deploy ==='
	$normalizedCommands = $commands -replace "`r`n", "`n"
	$normalizedCommands | & ssh $server 'bash -se'

	if ($LASTEXITCODE -ne 0) {
		throw 'Remote deploy failed.'
	}
}
finally {
	if (Test-Path $releaseBundle) {
		Remove-Item $releaseBundle -Force
	}

	Pop-Location
}
