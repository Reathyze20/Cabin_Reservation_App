param(
    [string]$ServerHost = "89.221.217.81",
    [string]$ServerUser = "root",
    [string]$AppUser = "reathyze",
    [string]$AppPath = "/home/reathyze/chata",
    [string]$NvmDir = "/home/reathyze/.nvm",
    [string]$Pm2ProcessName = "chata-app",
    [string]$LocalHealthUrl = "http://localhost:3000/api/health",
    [string]$LocalWebUrl = "http://localhost:3000/",
    [string]$PublicBaseUrl = "https://kdynachatu.cz",
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
$bashNvmDir = ConvertTo-BashSingleQuotedString -Value $NvmDir
$bashPm2ProcessName = ConvertTo-BashSingleQuotedString -Value $Pm2ProcessName
$bashLocalHealthUrl = ConvertTo-BashSingleQuotedString -Value $LocalHealthUrl
$bashLocalWebUrl = ConvertTo-BashSingleQuotedString -Value $LocalWebUrl
$requireOperationsMinimumValue = if ($RequireOperationsMinimum.IsPresent) { "1" } else { "0" }

$remoteLines = @(
    'set -euo pipefail',
    '',
    "app_user=$bashAppUser",
    "app_path=$bashAppPath",
    "nvm_dir=$bashNvmDir",
    "pm2_process_name=$bashPm2ProcessName",
    "local_health_url=$bashLocalHealthUrl",
    "local_web_url=$bashLocalWebUrl",
    "require_operations_minimum=$requireOperationsMinimumValue",
    'user_home=$(dirname "$nvm_dir")',
    'module_conf_path="$user_home/.pm2/module_conf.json"',
    '',
    'if ! id "$app_user" >/dev/null 2>&1; then',
    '  echo "Missing user: $app_user" >&2',
    '  exit 1',
    'fi',
    '',
    'if [ ! -d "$app_path" ]; then',
    '  echo "Missing app path: $app_path" >&2',
    '  exit 1',
    'fi',
    '',
    'app_shell_base="export NVM_DIR=$nvm_dir; [ -s $nvm_dir/nvm.sh ] && . $nvm_dir/nvm.sh; cd $app_path"',
    '',
    'echo "=== PM2 process ==="',
    'su - "$app_user" -s /bin/bash -c "$app_shell_base; npx pm2 describe \"$pm2_process_name\" --no-color" | tee /tmp/chata-pm2-describe.txt >/dev/null',
    'if ! grep -Eiq "status.*online" /tmp/chata-pm2-describe.txt; then',
    '  echo "PM2 process is not online." >&2',
    '  exit 1',
    'fi',
    '',
    'echo "=== Local web ==="',
    'curl -fsS -o /dev/null "$local_web_url"',
    'echo "Local web OK: $local_web_url"',
    '',
    'echo "=== Local health ==="',
    'health_response=$(curl -fsS "$local_health_url")',
    'echo "$health_response"',
    'if ! printf "%s" "$health_response" | grep -q "\"status\":\"ok\""; then',
    '  echo "Health endpoint did not return status ok." >&2',
    '  exit 1',
    'fi',
    '',
    'if [ "$require_operations_minimum" = "1" ]; then',
    '  echo "=== Backup cron ==="',
    '  backup_cron=$(crontab -u "$app_user" -l 2>/dev/null | grep "cabin-backup.lock" || true)',
    '  if [ -z "$backup_cron" ]; then',
    '    echo "Backup cron is not installed for $app_user." >&2',
    '    exit 1',
    '  fi',
    '  printf "%s\n" "$backup_cron"',
    '  echo "=== PM2 log rotation ==="',
    '  pm2_modules=$(su - "$app_user" -s /bin/bash -c "$app_shell_base; npx pm2 module:list")',
    '  echo "$pm2_modules"',
    '  if ! printf "%s" "$pm2_modules" | grep -q "pm2-logrotate"; then',
    '    echo "pm2-logrotate is not installed." >&2',
    '    exit 1',
    '  fi',
    '  if [ ! -f "$module_conf_path" ]; then',
    '    echo "Missing PM2 module config file: $module_conf_path" >&2',
    '    exit 1',
    '  fi',
    '  grep -A8 '"'"'"pm2-logrotate"'"'"' "$module_conf_path" || cat "$module_conf_path"',
    '  for required_key in '"'"'max_size'"'"' '"'"'retain'"'"' '"'"'compress'"'"' '"'"'rotateInterval'"'"' '"'"'workerInterval'"'"'; do',
    '    if ! grep -q "\"$required_key\"" "$module_conf_path"; then',
    '      echo "pm2-logrotate config is missing key: $required_key" >&2',
    '      exit 1',
    '    fi',
    '  done',
    'fi',
    '',
    'echo "=== Last PM2 log lines ==="',
    'su - "$app_user" -s /bin/bash -c "$app_shell_base; npx pm2 logs \"$pm2_process_name\" --lines 15 --nostream"'
)

$remoteScript = $remoteLines -join "`n"

Write-Host "Running server-side smoke checks on $ServerUser@$ServerHost..."
$remoteScript | ssh "$ServerUser@$ServerHost" "bash -se"

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

if (-not $SkipPublicChecks.IsPresent) {
    $normalizedPublicBaseUrl = $PublicBaseUrl.TrimEnd('/')
    $publicHealthUrl = "$normalizedPublicBaseUrl/api/health"

    Write-Host "Running public web checks..."
    $publicWebResponse = Invoke-WebRequest -Uri $normalizedPublicBaseUrl -Method Get -TimeoutSec 20
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