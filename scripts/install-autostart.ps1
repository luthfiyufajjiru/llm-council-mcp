# Registers the LLM Council MCP HTTP service to start at user logon (Windows Task Scheduler).
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\install-autostart.ps1 [-Port 8765]
#         powershell -ExecutionPolicy Bypass -File scripts\install-autostart.ps1 -Uninstall
param(
  [int]$Port = 8765,
  [switch]$Uninstall
)

$TaskName = "LLMCouncilMCP"
$Root = Split-Path -Parent $PSScriptRoot

if ($Uninstall) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Removed task $TaskName"
  return
}

$node = (Get-Command node -ErrorAction Stop).Source
$entry = Join-Path $Root "dist\index.js"
if (-not (Test-Path $entry)) { throw "dist\index.js missing. Run 'npm run build' first." }
$log = Join-Path $Root "council.log"

$cmd = "Set-Location '$Root'; & '$node' '$entry' --http --port $Port 2>> '$log'"
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -WindowStyle Hidden -Command `"$cmd`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings `
  -Description "LLM Council MCP shared HTTP service (http://127.0.0.1:$Port/mcp)" -Force | Out-Null

Write-Host "Registered task $TaskName (starts at logon). Endpoint: http://127.0.0.1:$Port/mcp"
Write-Host "Start now with: Start-ScheduledTask -TaskName $TaskName"
