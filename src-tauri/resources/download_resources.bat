@echo off
setlocal enabledelayedexpansion

echo ==============================================
echo 下载资源文件脚本
echo ==============================================
echo.

set "RESOURCES_DIR=%~dp0"
set "VB_CABLE_URL=https://download.vb-audio.com/Download_CABLE/VB-CABLE_Setup_x64.exe"
set "FFMPEG_URL=https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"

echo 当前目录: %RESOURCES_DIR%
echo.

echo [1/2] 正在下载 VB-CABLE 虚拟音频驱动...
powershell -Command "Invoke-WebRequest -Uri '%VB_CABLE_URL%' -OutFile '%RESOURCES_DIR%VB-CABLE_Installer.exe'"

if %errorlevel% equ 0 (
    echo 成功下载 VB-CABLE_Installer.exe
) else (
    echo 下载 VB-CABLE 失败，请手动从 https://vb-audio.com/Cable/index.htm 下载
    pause
    exit /b 1
)

echo.
echo [2/2] 正在下载 FFmpeg...
powershell -Command "Invoke-WebRequest -Uri '%FFMPEG_URL%' -OutFile '%RESOURCES_DIR%ffmpeg.zip'"

if %errorlevel% equ 0 (
    echo 成功下载 ffmpeg.zip
) else (
    echo 下载 FFmpeg 失败，请手动从 https://github.com/BtbN/FFmpeg-Builds/releases 下载
    pause
    exit /b 1
)

echo.
echo 正在解压 FFmpeg...
powershell -Command "Expand-Archive -Path '%RESOURCES_DIR%ffmpeg.zip' -DestinationPath '%RESOURCES_DIR%ffmpeg_temp' -Force"

for /d %%i in ("%RESOURCES_DIR%ffmpeg_temp\*") do (
    set "FFMPEG_DIR=%%i"
)

if exist "!FFMPEG_DIR!\bin\ffmpeg.exe" (
    copy "!FFMPEG_DIR!\bin\ffmpeg.exe" "%RESOURCES_DIR%ffmpeg.exe"
    echo 成功提取 ffmpeg.exe
) else (
    echo 无法找到 ffmpeg.exe
    pause
    exit /b 1
)

rmdir /s /q "%RESOURCES_DIR%ffmpeg_temp"
del "%RESOURCES_DIR%ffmpeg.zip"

echo.
echo ==============================================
echo 资源文件下载完成！
echo ==============================================
echo 已下载的文件:
echo - VB-CABLE_Installer.exe (虚拟音频驱动)
echo - ffmpeg.exe (音频处理工具)
echo.
pause