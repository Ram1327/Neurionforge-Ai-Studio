# Start NeurionForge AI Studio Server
$ServerDir = $PSScriptRoot
Set-Location $ServerDir
$PythonExe = Join-Path $ServerDir ".venv\Scripts\python.exe"

if (-not (Test-Path $PythonExe)) {
    Write-Host "[ERROR] Virtual environment not found at $PythonExe" -ForegroundColor Red
    Write-Host "Please create the venv: python -m venv apps/server/.venv" -ForegroundColor Yellow
    exit 1
}

Write-Host "Starting NeurionForge AI Studio Server on http://localhost:8000..." -ForegroundColor Cyan
& $PythonExe main.py
