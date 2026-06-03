
$ErrorActionPreference = "Stop"
$CONFIG_DIR = "D:\valorant-bgm-player"
$ACTIVATION_FILE = Join-Path $CONFIG_DIR "activation-codes.json"
$MUSIC_FILE = Join-Path $CONFIG_DIR "music-library.json"

function Ensure-Directory {
    if (-not (Test-Path $CONFIG_DIR)) {
        New-Item -ItemType Directory -Path $CONFIG_DIR -Force | Out-Null
    }
}

function Generate-Code {
    $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    $code = ""
    for ($i = 0; $i -lt 12; $i++) {
        if ($i -gt 0 -and $i % 4 -eq 0) { $code += "-" }
        $code += $chars[(Get-Random -Maximum $chars.Length)]
    }
    return $code
}

function Load-Codes {
    if (Test-Path $ACTIVATION_FILE) {
        return (Get-Content $ACTIVATION_FILE -Raw) | ConvertFrom-Json
    }
    return @()
}

function Save-Codes($codes) {
    Ensure-Directory
    $codes | ConvertTo-Json -Depth 10 | Set-Content $ACTIVATION_FILE
}

function Show-Menu {
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host "   Valorant BGM Player - Admin Tool" -ForegroundColor Cyan
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host "1. Generate activation code"
    Write-Host "2. List all activation codes"
    Write-Host "3. Delete activation code"
    Write-Host "4. Exit"
    Write-Host "==========================================="
    Write-Host ""
}

function Generate-NewCode {
    $days = Read-Host "Enter valid days (leave blank for permanent)"
    $code = Generate-Code
    $codes = Load-Codes
    
    $expiresAt = $null
    if ($days -and [int]::TryParse($days, [ref]$null)) {
        $expiresAt = (Get-Date).AddDays([int]$days).ToString("yyyy-MM-ddTHH:mm:ssZ")
    }

    $codes += [PSCustomObject]@{
        code = $code
        created_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
        expires_at = $expiresAt
        used = $false
    }

    Save-Codes $codes

    Write-Host ""
    Write-Host "Activation code generated successfully!" -ForegroundColor Green
    Write-Host "Code: $code" -ForegroundColor Yellow
    Write-Host "Valid: $(if ($days) { "$days days" } else { "Permanent" })" -ForegroundColor Gray
}

function List-Codes {
    $codes = Load-Codes
    if ($codes.Count -eq 0) {
        Write-Host ""
        Write-Host "No activation codes" -ForegroundColor Gray
        return
    }

    Write-Host ""
    Write-Host "All activation codes:" -ForegroundColor Cyan
    Write-Host "-------------------------------------------" -ForegroundColor Gray
    for ($i = 0; $i -lt $codes.Count; $i++) {
        $c = $codes[$i]
        $statusColor = if ($c.used) { "Red" } else { "Green" }
        $statusText = if ($c.used) { "Used" } else { "Available" }
        Write-Host "$($i+1). $($c.code)"
        Write-Host "   Created: $($c.created_at)"
        Write-Host "   Status: $statusText" -ForegroundColor $statusColor
        if ($c.expires_at) {
            Write-Host "   Expires: $($c.expires_at)"
        }
        Write-Host "-------------------------------------------" -ForegroundColor Gray
    }
}

function Delete-Code {
    $codes = Load-Codes
    if ($codes.Count -eq 0) {
        Write-Host ""
        Write-Host "No activation codes" -ForegroundColor Gray
        return
    }

    Write-Host ""
    Write-Host "All activation codes:" -ForegroundColor Cyan
    for ($i = 0; $i -lt $codes.Count; $i++) {
        $c = $codes[$i]
        $status = if ($c.used) { "[Used]" } else { "[Available]" }
        Write-Host "$($i+1). $($c.code) $status"
    }

    $choice = Read-Host "`nSelect number to delete"
    $idx = [int]::TryParse($choice, [ref]$null) - 1
    if ($idx -ge 0 -and $idx -lt $codes.Count) {
        $deleted = $codes[$idx]
        $newCodes = @()
        for ($i = 0; $i -lt $codes.Count; $i++) {
            if ($i -ne $idx) { $newCodes += $codes[$i] }
        }
        Save-Codes $newCodes
        Write-Host ""
        Write-Host "Deleted code: $($deleted.code)" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Invalid choice" -ForegroundColor Red
    }
}

Write-Host "Welcome to Valorant BGM Player Admin Tool!" -ForegroundColor Magenta

while ($true) {
    Show-Menu
    $choice = Read-Host "Select option"

    switch ($choice.Trim()) {
        "1" { Generate-NewCode }
        "2" { List-Codes }
        "3" { Delete-Code }
        "4" {
            Write-Host ""
            Write-Host "Goodbye!" -ForegroundColor Cyan
            exit 0
        }
        default {
            Write-Host ""
            Write-Host "Invalid choice" -ForegroundColor Red
        }
    }
}
