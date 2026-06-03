use tauri::command;
use std::fs;
use std::path::PathBuf;
use crate::config::AppConfig;
use crate::path_utils;

#[command]
pub fn get_bgm_storage_path(app_handle: tauri::AppHandle) -> Result<String, String> {
    use std::path::PathBuf;
    let store_path = PathBuf::from("storage-path.json");
    let store = tauri_plugin_store::StoreBuilder::new(&app_handle, store_path).build()
        .map_err(|e| format!("创建存储失败: {}", e))?;
    
    let custom_path: Option<String> = store.get("bgm_storage_path")
        .and_then(|v| v.as_str().map(|s| s.to_string()));
    
    if let Some(path) = custom_path {
        Ok(path)
    } else {
        Ok(path_utils::get_bgm_storage_path_str())
    }
}

#[command]
pub fn set_bgm_storage_path(app_handle: tauri::AppHandle, new_path: String) -> Result<String, String> {
    let path = PathBuf::from(&new_path);
    
    if !path.exists() {
        std::fs::create_dir_all(&path).map_err(|e| format!("创建目录失败: {}", e))?;
    }
    
    let win_dir = path.join("win");
    let lose_dir = path.join("lose");
    std::fs::create_dir_all(&win_dir).map_err(|e| format!("创建 win 目录失败: {}", e))?;
    std::fs::create_dir_all(&lose_dir).map_err(|e| format!("创建 lose 目录失败: {}", e))?;
    
    use std::path::PathBuf;
    let store_path = PathBuf::from("storage-path.json");
    let store = tauri_plugin_store::StoreBuilder::new(&app_handle, store_path).build()
        .map_err(|e| format!("创建存储失败: {}", e))?;
    
    store.set("bgm_storage_path", new_path.clone());
    
    store.save().map_err(|e| format!("保存存储失败: {}", e))?;
    
    path_utils::set_custom_bgm_path(Some(path));
    
    Ok(format!("BGM 存储路径已设置为: {}", new_path))
}

#[command]
pub fn migrate_bgm_files(app_handle: tauri::AppHandle) -> Result<serde_json::Value, String> {
    use std::path::PathBuf;
    let store_path = PathBuf::from("storage-path.json");
    let store = tauri_plugin_store::StoreBuilder::new(&app_handle, store_path).build()
        .map_err(|e| format!("创建存储失败: {}", e))?;
    
    let custom_path: Option<String> = store.get("bgm_storage_path")
        .and_then(|v| v.as_str().map(|s| s.to_string()));
    
    let new_path = match custom_path {
        Some(p) => PathBuf::from(p),
        None => return Err("未设置新的存储路径".to_string()),
    };
    
    let old_path = path_utils::get_app_data_dir().join("music");
    
    if !old_path.exists() {
        return Ok(serde_json::json!({
            "success": true,
            "migrated_count": 0,
            "message": "旧目录不存在，无需迁移"
        }));
    }
    
    let mut migrated_count = 0;
    
    if let Ok(entries) = fs::read_dir(&old_path) {
        for entry in entries.flatten() {
            let file_path = entry.path();
            if file_path.is_file() {
                let file_name = file_path.file_name().unwrap().to_string_lossy().to_string();
                let new_file_path = new_path.join(&file_name);
                
                if let Err(e) = fs::copy(&file_path, &new_file_path) {
                    eprintln!("迁移文件失败 {} -> {}: {}", file_path.display(), new_file_path.display(), e);
                } else {
                    migrated_count += 1;
                }
            }
        }
    }
    
    Ok(serde_json::json!({
        "success": true,
        "migrated_count": migrated_count,
        "message": format!("已迁移 {} 个文件", migrated_count)
    }))
}

#[command]
pub fn get_config() -> Result<serde_json::Value, String> {
    let config = crate::audio::get_config().ok_or("配置未初始化")?;
    let config = config.lock().map_err(|_| "无法获取配置")?;
    serde_json::to_value(&*config).map_err(|e| format!("{}", e))
}

#[command]
pub fn save_config(config: serde_json::Value) -> Result<String, String> {
    let app_config: AppConfig = serde_json::from_value(config).map_err(|e| format!("解析配置失败: {}", e))?;
    
    let config_store = crate::audio::get_config().ok_or("配置未初始化")?;
    let mut config = config_store.lock().map_err(|_| "无法获取配置")?;
    *config = app_config.clone();
    
    drop(config);
    
    let _ = path_utils::ensure_app_data_dir();
    let config_path = path_utils::get_config_path();
    let content = serde_json::to_string_pretty(&app_config).map_err(|e| format!("序列化失败: {}", e))?;
    fs::write(&config_path, content).map_err(|e| format!("写入文件失败: {}", e))?;
    
    Ok("配置已保存".to_string())
}

#[command]
pub fn pick_audio_files() -> Result<Vec<String>, String> {
    let paths = rfd::FileDialog::new()
        .set_title("选择音频文件")
        .add_filter("Audio", &["mp3", "wav", "flac", "ogg", "aac", "m4a"])
        .pick_files();

    let paths_str: Vec<String> = if let Some(paths) = paths {
        paths
            .into_iter()
            .map(|path| path.to_string_lossy().to_string())
            .collect()
    } else {
        Vec::new()
    };

    Ok(paths_str)
}

#[command]
pub fn export_config() -> Result<String, String> {
    let config = crate::audio::get_config().ok_or("配置未初始化")?;
    let config = config.lock().map_err(|_| "无法获取配置")?;
    let content = serde_json::to_string_pretty(&*config).map_err(|e| format!("序列化失败: {}", e))?;
    drop(config);
    
    let file_path = rfd::FileDialog::new()
        .set_title("导出配置")
        .add_filter("JSON", &["json"])
        .set_file_name("valorant-bgm-config.json")
        .save_file();
    
    let file_path = file_path.ok_or("用户取消了导出")?;
    fs::write(&file_path, content).map_err(|e| format!("写入文件失败: {}", e))?;
    
    Ok("配置已导出".to_string())
}

#[command]
pub fn import_config() -> Result<String, String> {
    let file_path = rfd::FileDialog::new()
        .set_title("导入配置")
        .add_filter("JSON", &["json"])
        .pick_file();
    
    let file_path = file_path.ok_or("用户取消了导入")?;
    let content = fs::read_to_string(&file_path).map_err(|e| format!("读取文件失败: {}", e))?;
    let app_config: AppConfig = serde_json::from_str(&content).map_err(|e| format!("解析配置失败: {}", e))?;
    
    let config_store = crate::audio::get_config().ok_or("配置未初始化")?;
    let mut config = config_store.lock().map_err(|_| "无法获取配置")?;
    *config = app_config.clone();
    drop(config);
    
    let _ = path_utils::ensure_app_data_dir();
    let config_path = path_utils::get_config_path();
    let content = serde_json::to_string_pretty(&app_config).map_err(|e| format!("序列化失败: {}", e))?;
    fs::write(&config_path, content).map_err(|e| format!("写入文件失败: {}", e))?;
    
    Ok("配置已导入，请重启程序生效".to_string())
}
