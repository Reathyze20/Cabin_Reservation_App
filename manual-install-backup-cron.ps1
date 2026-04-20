param(
    [string]$ServerHost = "89.221.217.81",
    [string]$ServerUser = "root",
    [string]$AppUser = "reathyze",
    [string]$AppPath = "/home/reathyze/chata",
  [string]$NvmDir = "/home/reathyze/.nvm",
    [string]$BackupRoot = "/home/reathyze/backups/cabin",
    [string]$CronSchedule = "0 3 * * *",
    [int]$RetentionDays = 14,
    [switch]$RunInitialBackup
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function ConvertTo-BashSingleQuotedString {
    param([Parameter(Mandatory = $true)][string]$Value)

  $bashQuoteEscape = "'" + '"' + "'" + '"' + "'"
  return "'" + $Value.Replace("'", $bashQuoteEscape) + "'"
}

if ($RetentionDays -lt 1) {
    throw "RetentionDays must be 1 or higher."
}

$backupCommandInner = "export NVM_DIR=$NvmDir; [ -s $NvmDir/nvm.sh ] && . $NvmDir/nvm.sh; mkdir -p $BackupRoot $AppPath/data/logs; cd $AppPath; BACKUP_ROOT=$BackupRoot BACKUP_RETENTION_DAYS=$RetentionDays npm run backup:all >> $AppPath/data/logs/backup-cron.log 2>&1"
$cronCommand = "/usr/bin/flock -n /tmp/cabin-backup.lock /bin/bash -lc " + (ConvertTo-BashSingleQuotedString -Value $backupCommandInner)
$cronLine = "$CronSchedule $cronCommand"

$bashAppUser = ConvertTo-BashSingleQuotedString -Value $AppUser
$bashAppPath = ConvertTo-BashSingleQuotedString -Value $AppPath
$bashNvmDir = ConvertTo-BashSingleQuotedString -Value $NvmDir
$bashBackupRoot = ConvertTo-BashSingleQuotedString -Value $BackupRoot
$bashCronLine = ConvertTo-BashSingleQuotedString -Value $cronLine
$runInitialBackupValue = if ($RunInitialBackup.IsPresent) { "1" } else { "0" }

$remoteScript = @"
set -euo pipefail

app_user=$bashAppUser
app_path=$bashAppPath
nvm_dir=$bashNvmDir
backup_root=$bashBackupRoot
retention_days=$RetentionDays
cron_line=$bashCronLine
run_initial_backup=$runInitialBackupValue

if ! id "`$app_user" >/dev/null 2>&1; then
  echo "Missing user: `$app_user" >&2
  exit 1
fi

if [ ! -d "`$app_path" ]; then
  echo "Missing app path: `$app_path" >&2
  exit 1
fi

if [ ! -f "`$app_path/package.json" ]; then
  echo "Missing package.json in `$app_path" >&2
  exit 1
fi

if [ ! -s "`$nvm_dir/nvm.sh" ]; then
  echo "Missing nvm.sh in `$nvm_dir" >&2
  exit 1
fi

if ! grep -q '"backup:all"' "`$app_path/package.json"; then
  echo "backup:all script is not deployed on the server yet. Deploy local changes first." >&2
  exit 1
fi

if [ ! -f "`$app_path/src/scripts/backupManager.ts" ]; then
  echo "backupManager.ts is not deployed on the server yet. Deploy local changes first." >&2
  exit 1
fi

if ! su - "`$app_user" -s /bin/bash -c "export NVM_DIR=`$nvm_dir; . `$nvm_dir/nvm.sh; command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1"; then
  echo "Node/npm are not available for `$app_user even after sourcing NVM." >&2
  exit 1
fi

install -d -m 755 -o "`$app_user" -g "`$app_user" "`$backup_root" "`$app_path/data/logs"

existing_crontab="`$(mktemp)"
updated_crontab="`$(mktemp)"

cleanup() {
  rm -f "`$existing_crontab" "`$updated_crontab"
}

trap cleanup EXIT

crontab -u "`$app_user" -l 2>/dev/null | grep -v 'cabin-backup.lock' > "`$existing_crontab" || true

: > "`$updated_crontab"

if ! grep -qxF 'SHELL=/bin/bash' "`$existing_crontab"; then
  echo 'SHELL=/bin/bash' >> "`$updated_crontab"
fi

if ! grep -qxF 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' "`$existing_crontab"; then
  echo 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' >> "`$updated_crontab"
fi

cat "`$existing_crontab" >> "`$updated_crontab"
echo "`$cron_line" >> "`$updated_crontab"

awk 'NF && !seen[`$0]++' "`$updated_crontab" | crontab -u "`$app_user" -

echo 'Installed backup cron:'
crontab -u "`$app_user" -l

if [ "`$run_initial_backup" = "1" ]; then
  su - "`$app_user" -s /bin/bash -c "export NVM_DIR=`$nvm_dir; . `$nvm_dir/nvm.sh; cd `$app_path; BACKUP_ROOT=`$backup_root BACKUP_RETENTION_DAYS=`$retention_days npm run backup:all"
fi
"@

Write-Host "Installing backup cron on $ServerUser@$ServerHost for app user $AppUser..."
$remoteScript | ssh "$ServerUser@$ServerHost" "bash -se"

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host "Backup cron installation finished."