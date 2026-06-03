
$ErrorActionPreference = "Stop"

$CONFIG_DIR = "D:\valorant-bgm-player"
$ACTIVATION_FILE = Join-Path $CONFIG_DIR "activation-codes.json"

# Ensure directory exists
New-Item -ItemType Directory -Path $CONFIG_DIR -Force | Out-Null

$chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
$code = ""
for ($i = 0; $i -lt 12; $i++) {
    if ($i -gt 0 -and $i % 4 -eq 0) { $code += "-" }
    $code += $chars[(Get-Random -Maximum $chars.Length)]
}

$codes = @()
if (Test-Path $ACTIVATION_FILE) {
    try {
        $codes = (Get-Content $ACTIVATION_FILE -Raw) | ConvertFrom-Json
    } catch {
        $codes = @()
    }
}

$newCode = [PSCustomObject]@{
    code = $code
    created_at = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    expires_at = $null
    used = $false
}

$codes += $newCode

$jsonContent = $codes | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($ACTIVATION_FILE, $jsonContent)

Write-Host ""
Write-Host "Activation code generated successfully!" -ForegroundColor Green
Write-Host "Code: $code" -ForegroundColor Yellow
Write-Host "Location: $ACTIVATION_FILE" -ForegroundColor Gray
Write-Host ""
Write-Host "Please restart the Valorant BGM Player to use this code." -ForegroundColor Cyan
