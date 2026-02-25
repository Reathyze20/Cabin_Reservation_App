# Manual deployment script
# Run: .\manual-deploy.ps1

$commands = @"
cd /home/reathyze/chata
echo "=== Pulling latest code ==="
git fetch origin main
git reset --hard origin/main
echo "=== Installing dependencies ==="
npm install
echo "=== Running DB migrations ==="
npx prisma migrate deploy
echo "=== Generating Prisma client ==="
npx prisma generate
echo "=== Building frontend ==="
npm run build
echo "=== Restarting app ==="
kill `$(ss -tlnp | grep ':3000' | grep -oP 'pid=\K[0-9]+') 2>/dev/null || true
sleep 2
echo "=== Done ==="
"@

ssh root@89.221.217.81 $commands
