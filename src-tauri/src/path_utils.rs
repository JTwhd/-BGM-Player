use std::path::PathBuf;

static mut CUSTOM_BGM_PATH: Option<PathBuf> = None;

pub fn get_app_data_dir() -> PathBuf {
    if let Some(data_dir) = dirs::data_dir() {
        return data_dir.join("ValorantBGM");
    }
    
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."))
        .join("data")
        .join("ValorantBGM")
}

pub fn ensure_app_data_dir() -> Result<(), String> {
    let dir = get_app_data_dir();
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("创建数据目录失败: {}", e))?;
    Ok(())
}

pub fn get_config_path() -> PathBuf {
    get_app_data_dir().join("config.json")
}

pub fn get_activation_codes_path() -> PathBuf {
    get_app_data_dir().join("activation-codes.json")
}

pub fn set_custom_bgm_path(path: Option<PathBuf>) {
    unsafe {
        CUSTOM_BGM_PATH = path;
    }
}

pub fn get_custom_bgm_path() -> Option<PathBuf> {
    unsafe { CUSTOM_BGM_PATH.clone() }
}

pub fn get_music_dir() -> PathBuf {
    if let Some(custom_path) = get_custom_bgm_path() {
        return custom_path;
    }
    
    let exe_path = std::env::current_exe().ok();
    if let Some(exe) = exe_path {
        if let Some(exe_dir) = exe.parent() {
            let bgm_dir = exe_dir.join("BGM");
            if let Ok(_) = std::fs::create_dir_all(&bgm_dir) {
                return bgm_dir;
            }
        }
    }
    
    let d_drive = PathBuf::from("D:\\ValorantBGM");
    if d_drive.parent().map_or(false, |p| p.exists()) {
        if let Ok(_) = std::fs::create_dir_all(&d_drive) {
            return d_drive;
        }
    }
    
    get_app_data_dir().join("music")
}

pub fn ensure_music_dir() -> Result<(), String> {
    let dir = get_music_dir();
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("创建音乐目录失败: {}", e))?;
    Ok(())
}

pub fn get_bgm_dir(category: &str) -> PathBuf {
    get_music_dir().join(category)
}

pub fn ensure_bgm_dir(category: &str) -> Result<PathBuf, String> {
    let bgm_dir = get_bgm_dir(category);
    std::fs::create_dir_all(&bgm_dir)
        .map_err(|e| format!("创建BGM目录失败: {}", e))?;
    Ok(bgm_dir)
}

pub fn get_data_dir_str() -> String {
    get_app_data_dir().to_string_lossy().to_string()
}

pub fn get_bgm_storage_path_str() -> String {
    get_music_dir().to_string_lossy().to_string()
}
