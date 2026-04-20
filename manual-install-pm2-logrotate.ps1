param(
    [string]$ServerHost = "89.221.217.81",
    [string]$ServerUser = "root",
    [string]$AppUser = "reathyze",
    [string]$AppPath = "/home/reathyze/chata",
    [string]$NvmDir = "/home/reathyze/.nvm",
    [string]$MaxSize = "10M",
    [int]$Retain = 30,
    [string]$RotateInterval = "0 0 * * *",
    [int]$WorkerInterval = 30,
    [switch]$DisableCompression
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function ConvertTo-BashSingleQuotedString {
    param([Parameter(Mandatory = $true)][string]$Value)

    $bashQuoteEscape = "'" + '"' + "'" + '"' + "'"
    return "'" + $Value.Replace("'", $bashQuoteEscape) + "'"
}

if ($Retain -lt 1) {
    throw "Retain must be 1 or higher."
}

if ($WorkerInterval -lt 1) {
    throw "WorkerInterval must be 1 or higher."
}

if ($MaxSize.Trim().Length -eq 0) {
    throw "MaxSize must not be empty."
}

$compressValue = if ($DisableCompression.IsPresent) { "false" } else { "true" }

$bashAppUser = ConvertTo-BashSingleQuotedString -Value $AppUser
$bashAppPath = ConvertTo-BashSingleQuotedString -Value $AppPath
$bashNvmDir = ConvertTo-BashSingleQuotedString -Value $NvmDir
$bashMaxSize = ConvertTo-BashSingleQuotedString -Value $MaxSize
$bashRotateInterval = ConvertTo-BashSingleQuotedString -Value $RotateInterval

$remoteLines = @(
    'set -euo pipefail',
    '',
    "app_user=$bashAppUser",
    "app_path=$bashAppPath",
    "nvm_dir=$bashNvmDir",
    "max_size=$bashMaxSize",
    "rotate_interval=$bashRotateInterval",
    "retain=$Retain",
    "worker_interval=$WorkerInterval",
    "compress_value=$compressValue",
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
    'if [ ! -f "$app_path/package.json" ]; then',
    '  echo "Missing package.json in $app_path" >&2',
    '  exit 1',
    'fi',
    '',
    'app_shell_base="export NVM_DIR=$nvm_dir; [ -s $nvm_dir/nvm.sh ] && . $nvm_dir/nvm.sh; cd $app_path"',
    '',
    'if ! su - "$app_user" -s /bin/bash -c "$app_shell_base; npx pm2 module:list" | grep -q "pm2-logrotate"; then',
    '  su - "$app_user" -s /bin/bash -c "$app_shell_base; npx pm2 install pm2-logrotate"',
    'fi',
    '',
    'su - "$app_user" -s /bin/bash -c "$app_shell_base; npx pm2 set pm2-logrotate:max_size \"$max_size\"; npx pm2 set pm2-logrotate:retain $retain; npx pm2 set pm2-logrotate:compress $compress_value; npx pm2 set pm2-logrotate:rotateInterval \"$rotate_interval\"; npx pm2 set pm2-logrotate:workerInterval $worker_interval; npx pm2 save"',
    'echo "PM2 log rotation configured:"',
    'su - "$app_user" -s /bin/bash -c "$app_shell_base; npx pm2 module:list"',
    'echo',
    'if [ -f "$module_conf_path" ]; then',
    '  grep -A8 '"'"'"pm2-logrotate"'"'"' "$module_conf_path" || cat "$module_conf_path"',
    'else',
    '  echo "Missing PM2 module config file: $module_conf_path" >&2',
    '  exit 1',
    'fi'
)

$remoteScript = $remoteLines -join "`n"

Write-Host "Installing PM2 log rotation on $ServerUser@$ServerHost for app user $AppUser..."
$remoteScript | ssh "$ServerUser@$ServerHost" "bash -se"

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host "PM2 log rotation installation finished."