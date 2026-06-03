
@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File admin-tool.ps1
pause
