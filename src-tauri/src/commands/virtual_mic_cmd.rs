use tauri::command;
use crate::audio::get_virtual_mic_manager;

#[command]
pub fn enable_team_audio(file_path: String, output_device: String) -> Result<String, String> {
    println!("[CMD] enable_team_audio 调用 - 文件: {}, 设备: {}", file_path, output_device);
    
    let manager = get_virtual_mic_manager()
        .ok_or("虚拟麦克风管理器未初始化")?;
    let manager = manager.lock().map_err(|_| "无法获取锁")?;
    
    manager.enable_team_audio(&file_path, &output_device)?;
    Ok("已启用团队音频".to_string())
}

#[command]
pub fn disable_team_audio() -> Result<String, String> {
    println!("[CMD] disable_team_audio 调用");
    
    let manager = get_virtual_mic_manager()
        .ok_or("虚拟麦克风管理器未初始化")?;
    let manager = manager.lock().map_err(|_| "无法获取锁")?;
    
    manager.disable_team_audio();
    Ok("已禁用团队音频".to_string())
}

#[command]
pub fn is_team_audio_enabled() -> Result<bool, String> {
    let manager = get_virtual_mic_manager()
        .ok_or("虚拟麦克风管理器未初始化")?;
    let manager = manager.lock().map_err(|_| "无法获取锁")?;
    
    Ok(manager.is_team_audio_enabled())
}

#[command]
pub fn set_team_audio_volume(volume: f32) -> Result<String, String> {
    let manager = get_virtual_mic_manager()
        .ok_or("虚拟麦克风管理器未初始化")?;
    let manager = manager.lock().map_err(|_| "无法获取锁")?;
    
    manager.set_team_volume(volume);
    Ok(format!("团队音频音量已设置为: {}", volume))
}

#[command]
pub fn get_team_audio_status() -> Result<serde_json::Value, String> {
    let manager = get_virtual_mic_manager()
        .ok_or("虚拟麦克风管理器未初始化")?;
    let manager = manager.lock().map_err(|_| "无法获取锁")?;
    
    let is_enabled = manager.is_team_audio_enabled();
    let current_track = manager.get_current_track();
    
    Ok(serde_json::json!({
        "enabled": is_enabled,
        "current_track": current_track,
    }))
}
