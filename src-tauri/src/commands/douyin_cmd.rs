use tauri::command;
use crate::douyin_parser::{extract_douyin_with_bugpk, check_ffmpeg};

#[command]
pub async fn extract_douyin_audio(url: String, save_path: String) -> Result<serde_json::Value, String> {
    println!("[DOUYIN] 开始提取抖音音频: {} -> {}", url, save_path);
    
    match check_ffmpeg() {
        Ok(_) => {},
        Err(e) => {
            return Ok(serde_json::json!({
                "success": false,
                "error": e
            }));
        }
    };

    let result = extract_douyin_with_bugpk(&url, &save_path).await;
    
    match result {
        Ok(extracted) => {
            println!("[DOUYIN] 提取成功: {} -> {}", extracted.title, extracted.audio_path);
            Ok(serde_json::json!({
                "success": true,
                "title": extracted.title,
                "audio_path": extracted.audio_path,
            }))
        }
        Err(e) => {
            println!("[DOUYIN] 提取失败: {}", e);
            Ok(serde_json::json!({
                "success": false,
                "error": e,
            }))
        }
    }
}

#[command]
pub async fn add_audio_to_library(audio_path: String, title: String) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "success": true,
        "message": "功能已简化"
    }))
}
