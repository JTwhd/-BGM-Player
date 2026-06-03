$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$stateDir = Join-Path $projectRoot '.local-dev'

foreach ($name in @('frontend', 'backend')) {
  $pidPath = Join-Path $stateDir "$name.pid"
  if (-not (Test-Path -LiteralPath $pidPath)) {
    continue
  }

  $processId = Get-Content -LiteralPath $pidPath
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $processId -Force
    Write-Host "Stopped $name process $processId"
  }

  Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
}

$embeddedMongoRoot = Join-Path $projectRoot 'backend\node_modules\.cache\mongodb-memory-server'
Get-Process -Name 'mongod*' -ErrorAction SilentlyContinue |
  Where-Object { $_.Path -and $_.Path.StartsWith($embeddedMongoRoot, [System.StringComparison]::OrdinalIgnoreCase) } |
  ForEach-Object {
    Stop-Process -Id $_.Id -Force
    Write-Host "Stopped embedded MongoDB process $($_.Id)"
  }

Write-Host 'Recorded local development processes have been stopped.'
