@echo off
setlocal

echo Installing VB-CABLE virtual audio driver...

:: 检查是否已安装
reg query "HKLM\SOFTWARE\VB-Audio\CABLE" >nul 2>&1
if %errorlevel% equ 0 (
    echo VB-CABLE is already installed.
    exit /b 0
)

:: 安装虚拟音频驱动
echo Installing VB-CABLE...
"%~dp0VB-CABLE_Installer.exe" /S

if %errorlevel% equ 0 (
    echo VB-CABLE installed successfully!
) else (
    echo Failed to install VB-CABLE.
    exit /b 1
)
