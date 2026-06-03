use tauri::{command, Manager};
use crate::clipper::{AudioAnalyzer, clip_with_ffmpeg, manual_clip_with_ffmpeg, get_audio_duration};

#[command]
pub fn get_builtin_ffmpeg_path(app_handle: tauri::AppHandle) -> Result<String, String> {
    let resource_path = app_handle.path().resource_dir()
        .map_err(|e| format!("无法获取资源目录: {}", e))?;
    
    let possible_paths = vec![
        resource_path.join("binaries").join("ffmpeg.exe"),
        resource_path.join("ffmpeg.exe"),
        resource_path.join("..").join("ffmpeg.exe"),
        resource_path.join("..").join("..").join("ffmpeg.exe"),
        resource_path.join("..").join("..").join("..").join("ffmpeg.exe"),
        resource_path.join("resources").join("ffmpeg.exe"),
        std::env::current_exe()
            .ok()
            .and_then(|path| path.parent().map(|dir| dir.join("binaries").join("ffmpeg.exe")))
            .unwrap_or_default(),
    ];
    
    for path in &possible_paths {
        if path.exists() {
            return Ok(path.to_string_lossy().to_string());
        }
    }
    
    Err(format!("内置 FFmpeg 文件不存在，搜索路径: {:?}", possible_paths))
}

#[command]
pub fn test_ffmpeg(app_handle: tauri::AppHandle) -> Result<String, String> {
    // 优先使用内置的 FFmpeg
    if let Ok(builtin_path) = get_builtin_ffmpeg_path(app_handle) {
        return Ok(format!("✅ 内置 FFmpeg: {}", builtin_path));
    }
    
    // 如果内置的不行，尝试找外部的
    match crate::clipper::find_ffmpeg_path() {
        Ok(path) => Ok(format!("✅ 外部 FFmpeg: {}", path)),
        Err(e) => Err(format!("❌ FFmpeg 未找到: {}", e)),
    }
}

#[command]
pub fn auto_clip_bgm(
    app_handle: tauri::AppHandle,
    input_path: String,
    output_dir: String,
    clip_duration_secs: Option<f64>,
) -> Result<Vec<String>, String> {
    let duration = clip_duration_secs.unwrap_or(7.0);
    
    // 优先使用内置的 FFmpeg
    let ffmpeg_path = match get_builtin_ffmpeg_path(app_handle) {
        Ok(path) => path,
        Err(_) => {
            // 如果内置的不行，尝试找外部的
            crate::clipper::find_ffmpeg_path()?
        }
    };
    
    let analyzer = AudioAnalyzer::new();
    let start_times = analyzer.find_climax_segments(&input_path, duration, &ffmpeg_path)?;
    
    if start_times.is_empty() {
        return Err("无法找到合适的高潮片段".to_string());
    }
    
    let output_paths = clip_with_ffmpeg(&input_path, &output_dir, &start_times, duration, &ffmpeg_path)?;
    
    Ok(output_paths)
}

#[command]
pub fn manual_clip_audio(
    app_handle: tauri::AppHandle,
    input_path: String,
    output_path: String,
    start_time: f64,
    end_time: f64,
) -> Result<String, String> {
    let ffmpeg_path = match get_builtin_ffmpeg_path(app_handle) {
        Ok(path) => path,
        Err(_) => crate::clipper::find_ffmpeg_path()?,
    };
    
    manual_clip_with_ffmpeg(&input_path, &output_path, start_time, end_time, &ffmpeg_path)
}

#[command]
pub fn get_audio_duration_cmd(app_handle: tauri::AppHandle, input_path: String) -> Result<f64, String> {
    let ffmpeg_path = match get_builtin_ffmpeg_path(app_handle) {
        Ok(path) => path,
        Err(_) => crate::clipper::find_ffmpeg_path()?,
    };
    
    get_audio_duration(&input_path, &ffmpeg_path)
}
