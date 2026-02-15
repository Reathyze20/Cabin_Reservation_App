# Manual deployment script
# Run: .\manual-deploy.ps1

$commands = @"
cd /root/Cabin_Reservation_App
echo "=== Pulling latest code ==="
git fetch origin main
git reset --hard origin/main
echo "=== Installing dependencies ==="
npm install
echo "=== Building frontend ==="
npm run build
echo "=== Restarting PM2 ==="
pm2 restart chata-app
pm2 logs chata-app --lines 20
"@

ssh root@89.221.217.81 $commands
