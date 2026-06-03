
!define APPNAME "Valorant BGM Player"
!define APPID "com.valorant.bgm.player"

# 虚拟音频驱动文件名
!define VBCABLE_INSTALLER "VB-CABLE_Installer.exe"

# 在安装完成后运行虚拟音频驱动安装程序
Section "Virtual Audio Driver" SecVirtualDriver
  DetailPrint "Checking for virtual audio driver..."
  
  # 检查是否已经安装了 VB-CABLE
  ReadRegStr $0 HKLM "SOFTWARE\VB-Audio\CABLE" ""
  StrCmp $0 "" 0 SkipInstall
  
  DetailPrint "Installing virtual audio driver..."
  
  # 运行虚拟音频驱动安装程序
  SetOutPath $INSTDIR
  ExecWait '"$INSTDIR\resources\${VBCABLE_INSTALLER}" /S'
  
  SkipInstall:
  DetailPrint "Virtual audio driver is already installed."
SectionEnd

# 在卸载时移除虚拟音频驱动（可选）
Section -Post
  # 这里可以添加卸载时的清理操作
SectionEnd
