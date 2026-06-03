param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,

  [switch]$Installer
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

Push-Location $projectRoot
try {
  $env:VITE_API_BASE_URL = $ApiBaseUrl.TrimEnd('/')

  if ($Installer) {
    npm run tauri -- build
  } else {
    npm run build
  }

  if ($LASTEXITCODE -ne 0) {
    throw "Client build failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}
