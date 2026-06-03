use tauri::command;
use rfd::FileDialog;
use std::fs;

#[command]
pub fn pick_audio_file() -> Result<String, String> {
    let path = FileDialog::new()
        .add_filter("音频文件", &["mp3", "wav", "flac", "ogg", "aac", "m4a"])
        .pick_file();

    match path {
        Some(p) => Ok(p.to_string_lossy().to_string()),
        None => Err("用户取消选择".to_string()),
    }
}

#[command]
pub async fn pick_directory() -> Result<String, String> {
    let path = rfd::FileDialog::new()
        .pick_folder();

    match path {
        Some(p) => Ok(p.to_string_lossy().to_string()),
        None => Err("用户取消选择".to_string()),
    }
}

#[command]
pub fn delete_clip_file(path: String) -> Result<String, String> {
    fs::remove_file(&path).map_err(|e| format!("删除文件失败: {}", e))?;
    Ok(format!("已删除: {}", path))
}
