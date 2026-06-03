use crate::config::{ActivationInfo, OnlineTrack, BgmCategory};
use crate::path_utils;
use std::sync::Mutex;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use chrono::Utc;
use tauri::AppHandle;
use tauri::Manager;

lazy_static::lazy_static! {
    static ref ACTIVATION_CODES: Mutex<HashMap<String, ActivationCode>> = Mutex::new(HashMap::new());
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ActivationCode {
    pub code: String,
    pub created_at: String,
    pub expires_at: Option<String>,
    pub used: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct OnlineLibraryData {
    pub tracks: Vec<OnlineTrack>,
    pub last_updated: String,
    pub version: String,
}

// 获取激活状态
#[tauri::command]
pub fn get_activation_status() -> Result<ActivationInfo, String> {
    let config = crate::audio::get_config()
        .ok_or("无法获取配置")?;
    let config = config.lock().map_err(|_| "无法锁定配置")?;
    Ok(config.activation.clone())
}

// 验证激活码
#[tauri::command]
pub fn verify_activation_code(code: String) -> Result<ActivationInfo, String> {
    println!("[ACTIVATION] 验证激活码: {}", code);

    // 从存储的激活码中查找
    let codes = ACTIVATION_CODES.lock().map_err(|_| "无法访问激活码库")?;

    if let Some(activation) = codes.get(&code) {
        if !activation.used {
            // 激活成功
            let now = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

            let mut config = crate::audio::get_config()
                .ok_or("无法获取配置")?;
            let mut cfg = config.lock().map_err(|_| "无法锁定配置")?;

            cfg.activation = ActivationInfo {
                activated: true,
                activation_code: Some(code.clone()),
                activated_at: Some(now),
                expires_at: activation.expires_at.clone(),
            };

            // 保存配置
            drop(cfg);
            drop(config);

            let app = crate::audio::get_app_handle()
                .ok_or("无法获取应用句柄")?;

            // 保存到文件
            let config_path = get_config_path(&app);
            let config = crate::audio::get_config().unwrap();
            let cfg = config.lock().unwrap();
            let json = serde_json::to_string_pretty(&*cfg)
                .map_err(|e| format!("序列化失败: {}", e))?;
            fs::write(&config_path, json).map_err(|e| format!("保存失败: {}", e))?;
            drop(cfg);
            drop(config);

            println!("[ACTIVATION] 激活成功");

            let config = crate::audio::get_config().unwrap();
            let cfg = config.lock().unwrap();
            Ok(cfg.activation.clone())
        } else {
            Err("激活码已被使用".to_string())
        }
    } else {
        Err("无效的激活码".to_string())
    }
}

// 获取在线音乐库
#[tauri::command]
pub fn get_online_library() -> Result<OnlineLibraryData, String> {
    println!("[ONLINE-LIBRARY] 获取在线音乐库");

    // 检查激活状态
    let config = crate::audio::get_config()
        .ok_or("无法获取配置")?;
    let cfg = config.lock().map_err(|_| "无法锁定配置")?;

    if !cfg.activation.activated {
        return Err("请先激活程序".to_string());
    }
    drop(cfg);
    drop(config);

    // 返回模拟数据（本地版本）
    // 未来这里会连接真实的在线API
    let tracks = vec![
        OnlineTrack {
            id: "online_001".to_string(),
            name: "史诗级胜利BGM".to_string(),
            category: BgmCategory::Victory,
            tags: vec!["史诗".to_string(), "震撼".to_string(), "管弦乐".to_string()],
            duration_secs: 10.0,
            preview_url: "".to_string(),
            download_url: "".to_string(),
            size_mb: 2.5,
        },
        OnlineTrack {
            id: "online_002".to_string(),
            name: "热血战斗BGM".to_string(),
            category: BgmCategory::Victory,
            tags: vec!["热血".to_string(), "战斗".to_string(), "电子".to_string()],
            duration_secs: 12.0,
            preview_url: "".to_string(),
            download_url: "".to_string(),
            size_mb: 3.0,
        },
        OnlineTrack {
            id: "online_003".to_string(),
            name: "悲壮失败BGM".to_string(),
            category: BgmCategory::Defeat,
            tags: vec!["悲壮".to_string(), "低沉".to_string(), "钢琴".to_string()],
            duration_secs: 8.0,
            preview_url: "".to_string(),
            download_url: "".to_string(),
            size_mb: 1.8,
        },
    ];

    Ok(OnlineLibraryData {
        tracks,
        last_updated: Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        version: "1.0.0".to_string(),
    })
}

// 添加激活码（管理功能）
#[tauri::command]
pub fn add_activation_code(code: String, expires_days: Option<i64>) -> Result<String, String> {
    let mut codes = ACTIVATION_CODES.lock().map_err(|_| "无法访问激活码库")?;

    let expires_at = expires_days.map(|days| {
        let expiry = Utc::now() + chrono::Duration::days(days);
        expiry.format("%Y-%m-%d %H:%M:%S").to_string()
    });

    let activation = ActivationCode {
        code: code.clone(),
        created_at: Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        expires_at,
        used: false,
    };

    codes.insert(code.clone(), activation);

    println!("[ACTIVATION] 添加激活码: {} (有效期: {:?})", code, expires_days);

    Ok(format!("激活码 {} 已添加", code))
}

// 获取所有激活码（管理功能）
#[tauri::command]
pub fn get_all_activation_codes() -> Result<Vec<ActivationCode>, String> {
    let codes = ACTIVATION_CODES.lock().map_err(|_| "无法访问激活码库")?;
    let mut result: Vec<ActivationCode> = codes.values().cloned().collect();
    result.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(result)
}

// 初始化激活码库（从文件加载）
pub fn load_activation_codes(path: &PathBuf) -> Result<(), String> {
    if path.exists() {
        let content = fs::read_to_string(path)
            .map_err(|e| format!("读取失败: {}", e))?;
        let codes: Vec<ActivationCode> = serde_json::from_str(&content)
            .map_err(|e| format!("解析失败: {}", e))?;

        let mut store = ACTIVATION_CODES.lock().map_err(|_| "无法锁定")?;
        for code in codes {
            store.insert(code.code.clone(), code);
        }

        println!("[ACTIVATION] 已加载 {} 个激活码", store.len());
    }
    Ok(())
}

// 保存激活码库（到文件）
pub fn save_activation_codes(path: &PathBuf) -> Result<(), String> {
    let codes = ACTIVATION_CODES.lock().map_err(|_| "无法锁定")?;
    let codes_vec: Vec<&ActivationCode> = codes.values().collect();
    let json = serde_json::to_string_pretty(&codes_vec)
        .map_err(|e| format!("序列化失败: {}", e))?;
    fs::write(path, json).map_err(|e| format!("保存失败: {}", e))?;
    println!("[ACTIVATION] 已保存 {} 个激活码", codes.len());
    Ok(())
}

fn get_config_path(_app: &AppHandle) -> PathBuf {
    let _ = path_utils::ensure_app_data_dir();
    path_utils::get_config_path()
}
