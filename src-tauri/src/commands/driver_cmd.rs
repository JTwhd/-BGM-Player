use std::process::Command;
use std::path::Path;
use tauri::Manager;

#[tauri::command]
pub fn install_virtual_audio_driver(app_handle: tauri::AppHandle) -> Result<String, String> {
    // 使用 Tauri 2.0 的路径 API
    let resource_path = app_handle.path().resource_dir()
        .map_err(|e| format!("无法获取资源目录: {}", e))?;
    
    let driver_path = resource_path.join("VB-CABLE_Installer.exe");
    let driver_path_str = driver_path.to_string_lossy().to_string();
    
    if !Path::new(&driver_path_str).exists() {
        return Err("虚拟音频驱动安装程序未找到，请重新安装程序".to_string());
    }
    
    // 检查是否已安装
    let reg_check = Command::new("reg")
        .args(["query", "HKLM\\SOFTWARE\\VB-Audio\\CABLE"])
        .output();
    
    if let Ok(output) = reg_check {
        if output.status.success() {
            return Ok("虚拟音频驱动已安装".to_string());
        }
    }
    
    // 安装驱动（静默安装）
    let result = Command::new(&driver_path_str)
        .arg("/S")
        .output()
        .map_err(|e| format!("无法启动安装程序: {}", e))?;
    
    if result.status.success() {
        Ok("虚拟音频驱动安装成功！请重启程序以使用".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&result.stderr);
        Err(format!("安装失败: {}", stderr))
    }
}

#[tauri::command]
pub fn check_virtual_audio_driver() -> Result<bool, String> {
    let output = Command::new("reg")
        .args(["query", "HKLM\\SOFTWARE\\VB-Audio\\CABLE"])
        .output();
    
    match output {
        Ok(output) => Ok(output.status.success()),
        Err(e) => Err(format!("检查失败: {}", e)),
    }
}
