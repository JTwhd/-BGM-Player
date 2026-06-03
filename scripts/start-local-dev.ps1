$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot 'backend'
$stateDir = Join-Path $projectRoot '.local-dev'
$node = (Get-Command node).Source

New-Item -ItemType Directory -Force -Path $stateDir | Out-Null

function Test-HttpEndpoint {
  param([string]$Uri)

  try {
    Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Start-NodeProcess {
  param(
    [string]$WorkingDirectory,
    [string[]]$Arguments,
    [string]$Name
  )

  $stdout = Join-Path $stateDir "$Name.out.log"
  $stderr = Join-Path $stateDir "$Name.err.log"
  $process = Start-Process `
    -FilePath $node `
    -ArgumentList $Arguments `
    -WorkingDirectory $WorkingDirectory `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -WindowStyle Hidden `
    -PassThru

  Set-Content -LiteralPath (Join-Path $stateDir "$Name.pid") -Value $process.Id
  return $process
}

if (-not (Test-HttpEndpoint 'http://127.0.0.1:5000/api/health')) {
  Start-NodeProcess -WorkingDirectory $backendRoot -Arguments @('src/server.js') -Name 'backend' | Out-Null
}

if (-not (Test-HttpEndpoint 'http://127.0.0.1:5173')) {
  Start-NodeProcess `
    -WorkingDirectory $projectRoot `
    -Arguments @('node_modules/vite/bin/vite.js', '--host', '127.0.0.1') `
    -Name 'frontend' | Out-Null
}

for ($attempt = 0; $attempt -lt 20; $attempt++) {
  if (
    (Test-HttpEndpoint 'http://127.0.0.1:5000/api/health') -and
    (Test-HttpEndpoint 'http://127.0.0.1:5173')
  ) {
    Write-Host 'Local development environment is ready:'
    Write-Host '  Frontend: http://127.0.0.1:5173'
    Write-Host '  API:      http://127.0.0.1:5000/api'
    Write-Host '  Database: D:\BGM\valorant-bgm-player\.local-mongodb\data'
    exit 0
  }
  Start-Sleep -Milliseconds 500
}

Write-Host 'Startup timed out. Check logs in .local-dev.'
exit 1

