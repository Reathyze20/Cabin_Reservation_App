param(
    [string]$ServerHost = "89.221.217.81",
    [string]$ServerUser = "root",
    [string]$AppUser = "reathyze",
    [string]$AppPath = "/home/reathyze/chata",
    [string]$BackupRoot = "/home/reathyze/backups/cabin",
    [string]$NvmDir = "/home/reathyze/.nvm",
    [string]$Pm2ProcessName = "chata-app",
    [string]$LocalHealthUrl = "http://localhost:3000/api/health",
    [string]$LocalWebUrl = "http://localhost:3000/",
    [string]$PublicBaseUrl = "https://chataceskestredohori.cz",
    [switch]$RequireOperationsMinimum,
    [switch]$SkipPublicChecks
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function ConvertTo-BashSingleQuotedString {
    param([Parameter(Mandatory = $true)][string]$Value)

    $bashQuoteEscape = "'" + '"' + "'" + '"' + "'"
    return "'" + $Value.Replace("'", $bashQuoteEscape) + "'"
}

$bashAppUser = ConvertTo-BashSingleQuotedString -Value $AppUser
$bashAppPath = ConvertTo-BashSingleQuotedString -Value $AppPath
$bashBackupRoot = ConvertTo-BashSingleQuotedString -Value $BackupRoot
$bashNvmDir = ConvertTo-BashSingleQuotedString -Value $NvmDir
$bashPm2ProcessName = ConvertTo-BashSingleQuotedString -Value $Pm2ProcessName
$bashLocalHealthUrl = ConvertTo-BashSingleQuotedString -Value $LocalHealthUrl
$bashLocalWebUrl = ConvertTo-BashSingleQuotedString -Value $LocalWebUrl
$requireOperationsMinimumValue = if ($RequireOperationsMinimum.IsPresent) { "1" } else { "0" }

$remoteScript = @'
set -euo pipefail

app_user=__APP_USER__
app_path=__APP_PATH__
backup_root=__BACKUP_ROOT__
nvm_dir=__NVM_DIR__
pm2_process_name=__PM2_PROCESS_NAME__
local_health_url=__LOCAL_HEALTH_URL__
local_web_url=__LOCAL_WEB_URL__
require_operations_minimum=__REQUIRE_OPERATIONS_MINIMUM__
user_home=$(dirname "$nvm_dir")
module_dir="$user_home/.pm2/modules/pm2-logrotate"
module_conf_path="$user_home/.pm2/module_conf.json"
pm2_logs_dir="$user_home/.pm2/logs"
pm2_out_log="$pm2_logs_dir/${pm2_process_name}-out.log"
pm2_error_log="$pm2_logs_dir/${pm2_process_name}-error.log"

if ! id "$app_user" >/dev/null 2>&1; then
    echo "Missing user: $app_user" >&2
    exit 1
fi

if [ ! -d "$app_path" ]; then
    echo "Missing app path: $app_path" >&2
    exit 1
fi

run_as_app() {
    local user_script
    user_script="$(mktemp)"
    printf '%s\n' "$@" > "$user_script"
    chmod 700 "$user_script"
    chown "$app_user:$app_user" "$user_script"
    su - "$app_user" -s /bin/bash -c "/bin/bash '$user_script'"
    local status=$?
    rm -f "$user_script"
    return $status
}

echo "=== PM2 process ==="
run_as_app "export NVM_DIR=$nvm_dir" ". $nvm_dir/nvm.sh" "cd $app_path" "npx pm2 describe $pm2_process_name --no-color" | tee /tmp/chata-pm2-describe.txt >/dev/null
if ! grep -Eiq "status.*online" /tmp/chata-pm2-describe.txt; then
    echo "PM2 process is not online." >&2
    exit 1
fi

echo "=== Local health ==="
health_response=$(curl -fsS "$local_health_url")
echo "$health_response"
if ! printf "%s" "$health_response" | grep -q '"status":"ok"'; then
    echo "Health endpoint did not return status ok." >&2
    exit 1
fi

if [ "$require_operations_minimum" = "1" ]; then
    echo "=== Backup cron ==="
    backup_cron=$(crontab -u "$app_user" -l 2>/dev/null | grep 'cabin-backup.lock' || true)
    if [ -z "$backup_cron" ]; then
        echo "Backup cron is not installed for $app_user." >&2
        exit 1
    fi
    printf "%s\n" "$backup_cron"
    echo "=== Backup artifacts ==="
    db_backup=$(find "$backup_root/db" -maxdepth 1 -type f -name '*.dump' -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -n 1 | cut -d' ' -f2- || true)
    uploads_backup=$(find "$backup_root/uploads" -maxdepth 1 -type f -name '*.tar.gz' -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -n 1 | cut -d' ' -f2- || true)
    if [ -z "$db_backup" ] || [ -z "$uploads_backup" ]; then
        echo "Backup artifacts are missing in $backup_root." >&2
        exit 1
    fi
    printf "DB backup: %s\n" "$db_backup"
    printf "Uploads backup: %s\n" "$uploads_backup"
    echo "=== PM2 log rotation ==="
    if [ ! -d "$module_dir" ]; then
        echo "pm2-logrotate is not installed." >&2
        exit 1
    fi
    run_as_app "export NVM_DIR=$nvm_dir" ". $nvm_dir/nvm.sh" "cd $app_path" "npx pm2 ls"
    if [ ! -f "$module_conf_path" ]; then
        echo "Missing PM2 module config file: $module_conf_path" >&2
        exit 1
    fi
    grep -A8 pm2-logrotate "$module_conf_path" || cat "$module_conf_path"
    for required_key in 'max_size' 'retain' 'compress' 'rotateInterval' 'workerInterval'; do
        if ! grep -q "\"$required_key\"" "$module_conf_path"; then
            echo "pm2-logrotate config is missing key: $required_key" >&2
            exit 1
        fi
    done
fi

echo "=== Last PM2 log lines ==="
if [ -f "$pm2_out_log" ]; then
    echo "--- $pm2_out_log ---"
    tail -n 15 "$pm2_out_log"
fi
if [ -f "$pm2_error_log" ]; then
    echo "--- $pm2_error_log ---"
    tail -n 15 "$pm2_error_log"
fi
'@
$remoteScript = $remoteScript.Replace('__APP_USER__', $bashAppUser).Replace('__APP_PATH__', $bashAppPath).Replace('__BACKUP_ROOT__', $bashBackupRoot).Replace('__NVM_DIR__', $bashNvmDir).Replace('__PM2_PROCESS_NAME__', $bashPm2ProcessName).Replace('__LOCAL_HEALTH_URL__', $bashLocalHealthUrl).Replace('__LOCAL_WEB_URL__', $bashLocalWebUrl).Replace('__REQUIRE_OPERATIONS_MINIMUM__', $requireOperationsMinimumValue).Replace("`r`n", "`n")
$remoteScriptBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($remoteScript))

Write-Host "Running server-side smoke checks on $ServerUser@$ServerHost..."
ssh "$ServerUser@$ServerHost" "printf '%s' '$remoteScriptBase64' | base64 -d | bash -se"

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

if (-not $SkipPublicChecks.IsPresent) {
    $normalizedPublicBaseUrl = $PublicBaseUrl.TrimEnd('/')
    $publicHealthUrl = "$normalizedPublicBaseUrl/api/health"

    Write-Host "Running public web checks..."
    $publicWebResponse = Invoke-WebRequest -Uri $normalizedPublicBaseUrl -Method Get -TimeoutSec 20 -UseBasicParsing
    if ($publicWebResponse.StatusCode -lt 200 -or $publicWebResponse.StatusCode -ge 400) {
        throw "Public web returned unexpected status code: $($publicWebResponse.StatusCode)"
    }

    $publicHealthResponse = Invoke-RestMethod -Uri $publicHealthUrl -TimeoutSec 20
    if ($publicHealthResponse.status -ne 'ok') {
        throw "Public health endpoint did not return status ok."
    }

    Write-Host "Public web OK: $normalizedPublicBaseUrl"
    Write-Host "Public health OK: $publicHealthUrl"
}

Write-Host "Smoke check passed. Pokud nasazeni menilo auth nebo invites, navazte manualnim subsetem v docs/SPRINT-0-SMOKE-TEST.md."