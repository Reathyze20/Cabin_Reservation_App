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

$remoteScript = @'
set -euo pipefail

app_user=__APP_USER__
app_path=__APP_PATH__
nvm_dir=__NVM_DIR__
max_size=__MAX_SIZE__
rotate_interval=__ROTATE_INTERVAL__
retain=__RETAIN__
worker_interval=__WORKER_INTERVAL__
compress_value=__COMPRESS_VALUE__
user_home=$(dirname "$nvm_dir")
module_dir="$user_home/.pm2/modules/pm2-logrotate"
module_conf_path="$user_home/.pm2/module_conf.json"

if ! id "$app_user" >/dev/null 2>&1; then
    echo "Missing user: $app_user" >&2
    exit 1
fi

if [ ! -d "$app_path" ]; then
    echo "Missing app path: $app_path" >&2
    exit 1
fi

if [ ! -f "$app_path/package.json" ]; then
    echo "Missing package.json in $app_path" >&2
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

if [ ! -d "$module_dir" ]; then
    run_as_app "export NVM_DIR=$nvm_dir" ". $nvm_dir/nvm.sh" "cd $app_path" "npx pm2 install pm2-logrotate"
fi

run_as_app \
    "export NVM_DIR=$nvm_dir" \
    ". $nvm_dir/nvm.sh" \
    "cd $app_path" \
    "npx pm2 set pm2-logrotate:max_size '$max_size'" \
    "npx pm2 set pm2-logrotate:retain $retain" \
    "npx pm2 set pm2-logrotate:compress $compress_value" \
    "npx pm2 set pm2-logrotate:rotateInterval '$rotate_interval'" \
    "npx pm2 set pm2-logrotate:workerInterval $worker_interval" \
    "npx pm2 save"
echo "PM2 log rotation configured:"
run_as_app "export NVM_DIR=$nvm_dir" ". $nvm_dir/nvm.sh" "cd $app_path" "npx pm2 ls"
echo
if [ -f "$module_conf_path" ]; then
    grep -A8 pm2-logrotate "$module_conf_path" || cat "$module_conf_path"
else
    echo "Missing PM2 module config file: $module_conf_path" >&2
    exit 1
fi
'@
$remoteScript = $remoteScript.Replace('__APP_USER__', $bashAppUser).Replace('__APP_PATH__', $bashAppPath).Replace('__NVM_DIR__', $bashNvmDir).Replace('__MAX_SIZE__', $bashMaxSize).Replace('__ROTATE_INTERVAL__', $bashRotateInterval).Replace('__RETAIN__', [string]$Retain).Replace('__WORKER_INTERVAL__', [string]$WorkerInterval).Replace('__COMPRESS_VALUE__', $compressValue).Replace("`r`n", "`n")
$remoteScriptBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($remoteScript))

Write-Host "Installing PM2 log rotation on $ServerUser@$ServerHost for app user $AppUser..."
ssh "$ServerUser@$ServerHost" "printf '%s' '$remoteScriptBase64' | base64 -d | bash -se"

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host "PM2 log rotation installation finished."