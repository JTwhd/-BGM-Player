#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Builder;
use tauri::Manager;
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState};
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri_plugin_dialog;
use std::fs;
use std::fs::OpenOptions;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use std::thread;

mod audio;
mod commands;
mod config;
mod freesound;
mod hotkey;
mod clipper;
mod windows_audio;
mod path_utils;
mod douyin_parser;
#[cfg(windows)]
mod hotkey_ll;

struct BackendManagerInner {
    process: Mutex<Option<Child>>,
    ready: Mutex<bool>,
    startup_error: Mutex<Option<String>>,
}

type BackendManager = Arc<BackendManagerInner>;

fn get_backend_manager() -> BackendManager {
    static MANAGER: std::sync::OnceLock<BackendManager> = std::sync::OnceLock::new();
    MANAGER.get_or_init(|| {
        Arc::new(BackendManagerInner {
            process: Mutex::new(None),
            ready: Mutex::new(false),
            startup_error: Mutex::new(None),
        })
    }).clone()
}

fn show_main_window(app_handle: &tauri::AppHandle) {
    if let Some(w) = app_handle.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

#[tauri::command]
async fn is_backend_ready() -> Result<serde_json::Value, String> {
    let manager = get_backend_manager();
    let ready = *manager.ready.lock().unwrap();
    let error = manager.startup_error.lock().unwrap().clone();
    
    Ok(serde_json::json!({
        "ready": ready,
        "error": error,
    }))
}

#[tauri::command]
async fn restart_backend(app_handle: tauri::AppHandle) -> Result<String, String> {
    let manager = get_backend_manager();
    
    let mut process = manager.process.lock().unwrap();
    if let Some(mut child) = process.take() {
        let _ = child.kill();
    }
    
    *manager.ready.lock().unwrap() = false;
    *manager.startup_error.lock().unwrap() = None;
    
    let handle_clone = app_handle.clone();
    let manager_clone = manager.clone();
    
    let _ = std::thread::spawn(move || {
        start_backend(&handle_clone, &manager_clone);
    });
    
    Ok("正在重启后端服务...".to_string())
}

fn check_backend_health_blocking() -> bool {
    let client = reqwest::blocking::Client::new();
    match client.get("http://localhost:18080/api/v1/health")
        .timeout(Duration::from_secs(2))
        .send() {
        Ok(response) => response.status().is_success(),
        Err(_) => false,
    }
}

fn find_backend_exe(app_handle: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    let exe_name = if cfg!(windows) {
        "douyin-api-server.exe"
    } else {
        "douyin-api-server"
    };

    if let Ok(exe_path) = std::env::current_exe() {
        let Some(exe_dir) = exe_path.parent() else {
            return None;
        };
        let exe_dir = exe_dir.to_path_buf();
        let path = exe_dir.join(exe_name);
        if path.exists() {
            return Some(path);
        }
        
        let path = exe_dir.join("binaries").join(exe_name);
        if path.exists() {
            return Some(path);
        }
        
        let path = exe_dir.join("resources").join(exe_name);
        if path.exists() {
            return Some(path);
        }
    }

    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let path = resource_dir.join(exe_name);
        if path.exists() {
            return Some(path);
        }
        
        let path = resource_dir.join("binaries").join(exe_name);
        if path.exists() {
            return Some(path);
        }
    }

    None
}

fn start_backend(app_handle: &tauri::AppHandle, manager: &BackendManager) {
    println!("[MAIN] 正在启动后端...");

    if check_backend_health_blocking() {
        println!("[MAIN] 后端已在运行!");
        *manager.ready.lock().unwrap() = true;
        return;
    }

    let bgm_storage_path = path_utils::get_music_dir();
    let _ = path_utils::ensure_music_dir();
    let backend_cache_dir = path_utils::get_app_data_dir().join(".douyin-cache");
    if let Err(e) = fs::create_dir_all(&backend_cache_dir) {
        println!("[MAIN] 创建解析服务缓存目录失败: {}", e);
        *manager.startup_error.lock().unwrap() = Some(format!("创建解析服务缓存目录失败: {}", e));
        return;
    }

    let runtime_temp_dir = backend_cache_dir.join("runtime");
    if let Err(e) = fs::create_dir_all(&runtime_temp_dir) {
        *manager.startup_error.lock().unwrap() = Some(format!("Failed to create backend runtime directory: {}", e));
        return;
    }

    let log_path = backend_cache_dir.join("douyin-api-server.log");
    let log_file = match OpenOptions::new().create(true).append(true).open(&log_path) {
        Ok(file) => file,
        Err(e) => {
            println!("[MAIN] 创建解析服务日志失败: {}", e);
            *manager.startup_error.lock().unwrap() = Some(format!("创建解析服务日志失败: {}", e));
            return;
        }
    };
    let log_error_file = match log_file.try_clone() {
        Ok(file) => file,
        Err(e) => {
            println!("[MAIN] 打开解析服务日志失败: {}", e);
            *manager.startup_error.lock().unwrap() = Some(format!("打开解析服务日志失败: {}", e));
            return;
        }
    };

    let Some(backend_exe) = find_backend_exe(app_handle) else {
        println!("[MAIN] 警告: 找不到后端 exe 文件!");
        *manager.startup_error.lock().unwrap() = Some("找不到 douyin-api-server.exe，请确保它位于正确的位置".to_string());
        return;
    };

    println!("[MAIN] 启动后端进程: {:?}", backend_exe);
    let child_result = Command::new(backend_exe)
        .args([
            "--port", "18080",
            "--save-dir", bgm_storage_path.to_str().unwrap_or("")
        ])
        .env("TEMP", &runtime_temp_dir)
        .env("TMP", &runtime_temp_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::from(log_file))
        .stderr(Stdio::from(log_error_file))
        .spawn();

    match child_result {
        Ok(child) => {
            *manager.process.lock().unwrap() = Some(child);
            
            println!("[MAIN] 等待后端就绪...");
            let mut ready = false;
            for _ in 0..30 {
                thread::sleep(Duration::from_secs(1));
                if check_backend_health_blocking() {
                    ready = true;
                    println!("[MAIN] 后端已就绪!");
                    break;
                }
                let exited = manager.process.lock().unwrap()
                    .as_mut()
                    .and_then(|child| child.try_wait().ok().flatten());
                if let Some(status) = exited {
                    let log_tail = fs::read_to_string(&log_path)
                        .unwrap_or_default()
                        .lines()
                        .rev()
                        .take(8)
                        .collect::<Vec<_>>()
                        .into_iter()
                        .rev()
                        .collect::<Vec<_>>()
                        .join("\n");
                    let error = format!("Local parser exited early ({status}).\n{log_tail}");
                    eprintln!("[MAIN] {}", error);
                    *manager.startup_error.lock().unwrap() = Some(error);
                    return;
                }
                println!("[MAIN] 等待后端...");
            }
            
            *manager.ready.lock().unwrap() = ready;
            if !ready {
                println!("[MAIN] 警告: 后端启动超时");
                *manager.startup_error.lock().unwrap() = Some("后端启动超时，请检查网络连接或手动重启".to_string());
            }
        }
        Err(e) => {
            eprintln!("[MAIN] 启动后端失败: {}", e);
            *manager.startup_error.lock().unwrap() = Some(format!("启动后端失败: {}", e));
        }
    }
}

fn main() {
    // 使用共享路径工具
    let _app_data_dir = path_utils::get_app_data_dir();
    let _ = path_utils::ensure_app_data_dir();

    let config_path = path_utils::get_config_path();
    println!("[MAIN] 配置文件路径: {:?}", config_path);

    // Boost process priority for smooth audio during gaming
    windows_audio::boost_audio_priority();

    let config: config::AppConfig = if Path::new(&config_path).exists() {
        match fs::read_to_string(&config_path) {
            Ok(content) => {
                serde_json::from_str(&content).unwrap_or_else(|e| {
                    eprintln!("配置文件解析失败，使用默认配置: {}", e);
                    config::AppConfig::default()
                })
            }
            Err(e) => {
                eprintln!("读取配置文件失败: {}", e);
                config::AppConfig::default()
            }
        }
    } else {
        let default = config::AppConfig::default();
        match fs::write(&config_path, serde_json::to_string_pretty(&default).unwrap()) {
            Ok(_) => println!("已创建默认配置文件: {:?}", config_path),
            Err(e) => eprintln!("写入配置文件失败: {}", e),
        }
        default
    };

    println!("[MAIN] 初始化音频播放器，设备: {}, 监听音量: {}, 输出音量: {}", config.audio_device, config.listen_volume, config.output_volume);
    audio::init_with_config(config);
    audio::init_virtual_mic_manager();
    
    // 加载激活码
    let activation_codes_path = path_utils::get_activation_codes_path();
    match commands::activation_cmd::load_activation_codes(&activation_codes_path) {
        Ok(_) => println!("[MAIN] 激活码加载完成"),
        Err(e) => eprintln!("[MAIN] 加载激活码失败: {}", e),
    }
    
    println!("[MAIN] 所有组件初始化完成");

    Builder::new()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            let handle = app.handle().clone();

            // 设置app handle供其他模块使用
            audio::set_app_handle(handle.clone());

            // 加载自定义BGM存储路径
            {
                use std::path::PathBuf;
                let store_path = PathBuf::from("storage-path.json");
                if let Ok(store) = tauri_plugin_store::StoreBuilder::new(&handle, store_path).build() {
                    if let Some(custom_path) = store.get("bgm_storage_path")
                        .and_then(|v| v.as_str().map(|s| s.to_string()))
                    {
                        println!("[MAIN] 加载自定义BGM路径: {}", custom_path);
                        path_utils::set_custom_bgm_path(Some(PathBuf::from(&custom_path)));
                        let _ = path_utils::ensure_music_dir();
                    }
                }
            }

            hotkey::init(&handle);

            // --- Low-level keyboard hook (works in-game) ---
            #[cfg(windows)]
            {
                let hk_config = crate::audio::get_config().and_then(|c| {
                    c.lock().ok().map(|g| g.hotkeys.clone())
                });
                if let Some(hk) = hk_config {
                    crate::hotkey_ll::start_ll_hook(crate::hotkey_ll::HotkeyConfig {
                        victory_key: hk.victory_key,
                        defeat_key: hk.defeat_key,
                        stop_key: hk.stop_key,
                    });
                }
            }

            // --- System Tray ---
            let show = MenuItemBuilder::with_id("show", "显示窗口").build(&handle)?;
            let play_victory = MenuItemBuilder::with_id("tray_victory", "播放胜利 BGM").build(&handle)?;
            let play_defeat = MenuItemBuilder::with_id("tray_defeat", "播放失败 BGM").build(&handle)?;
            let stop = MenuItemBuilder::with_id("tray_stop", "停止播放").build(&handle)?;
            let quit = MenuItemBuilder::with_id("quit", "退出程序").build(&handle)?;

            let menu = MenuBuilder::new(&handle)
                .item(&show)
                .separator()
                .item(&play_victory)
                .item(&play_defeat)
                .item(&stop)
                .separator()
                .item(&quit)
                .build()?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Valorant BGM Player")
                .menu(&menu)
                .on_menu_event(|app_handle, event| {
                    match event.id().as_ref() {
                        "show" => {
                            show_main_window(app_handle);
                        }
                        "tray_victory" => {
                            let _ = crate::commands::audio_cmd::play_bgm("victory".to_string());
                        }
                        "tray_defeat" => {
                            let _ = crate::commands::audio_cmd::play_bgm("defeat".to_string());
                        }
                        "tray_stop" => {
                            let _ = crate::commands::audio_cmd::stop_bgm();
                        }
                        "quit" => {
                            let manager = get_backend_manager();
                            let mut process = manager.process.lock().unwrap();
                            if let Some(mut child) = process.take() {
                                let _ = child.kill();
                            }
                            #[cfg(windows)]
                            {
                                crate::hotkey_ll::stop_ll_hook();
                            }
                            std::process::exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event {
                        show_main_window(tray.app_handle());
                    }
                })
                .build(&handle)?;

            // Minimize to tray: intercept close -> hide
            if let Some(window) = handle.get_webview_window("main") {
                let w = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = w.hide();
                    }
                });
            }

            // 启动后端服务
            let app_handle_clone = app.handle().clone();
            let manager = get_backend_manager();
            let _ = std::thread::spawn(move || {
                start_backend(&app_handle_clone, &manager);
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::audio_cmd::play_bgm,
            commands::audio_cmd::play_file_preview,
            commands::audio_cmd::save_online_audio,
            commands::audio_cmd::play_file_preview_from,
            commands::audio_cmd::get_playback_position,
            commands::audio_cmd::play_specific_bgm,
            commands::audio_cmd::stop_bgm,
            commands::audio_cmd::pause_bgm,
            commands::audio_cmd::resume_bgm,
            commands::audio_cmd::get_now_playing,
            commands::audio_cmd::set_listen_volume,
            commands::audio_cmd::set_output_volume,
            commands::audio_cmd::get_output_devices,
            commands::audio_cmd::get_input_devices,
            commands::audio_cmd::check_virtual_audio_device,
            commands::audio_cmd::set_output_device,
            commands::audio_cmd::set_virtual_audio_device,
            commands::audio_cmd::add_track,
            commands::audio_cmd::update_track,
            commands::audio_cmd::rename_track,
            commands::audio_cmd::delete_track,
            commands::audio_cmd::toggle_favorite,
            commands::audio_cmd::import_jianying_bgm,
            commands::audio_cmd::get_status,
            commands::config_cmd::get_config,
            commands::config_cmd::save_config,
            commands::config_cmd::pick_audio_files,
            commands::config_cmd::export_config,
            commands::config_cmd::import_config,
            commands::ai_cmd::get_ai_recommendation,
            commands::ai_cmd::test_ai_connection,
            commands::hotkey::update_hotkeys,
            commands::clipper_cmd::auto_clip_bgm,
            commands::clipper_cmd::test_ffmpeg,
            commands::clipper_cmd::get_builtin_ffmpeg_path,
            commands::clipper_cmd::manual_clip_audio,
            commands::clipper_cmd::get_audio_duration_cmd,
            commands::file_dialog_cmd::pick_audio_file,
            commands::file_dialog_cmd::pick_directory,
            commands::file_dialog_cmd::delete_clip_file,
            commands::virtual_mic_cmd::enable_team_audio,
            commands::virtual_mic_cmd::disable_team_audio,
            commands::virtual_mic_cmd::is_team_audio_enabled,
            commands::virtual_mic_cmd::set_team_audio_volume,
            commands::virtual_mic_cmd::get_team_audio_status,
            commands::activation_cmd::get_activation_status,
            commands::activation_cmd::verify_activation_code,
            commands::activation_cmd::get_online_library,
            commands::activation_cmd::add_activation_code,
            commands::activation_cmd::get_all_activation_codes,
            commands::driver_cmd::install_virtual_audio_driver,
            commands::driver_cmd::check_virtual_audio_driver,
            commands::douyin_cmd::extract_douyin_audio,
            commands::douyin_cmd::add_audio_to_library,
            commands::config_cmd::get_bgm_storage_path,
            commands::config_cmd::set_bgm_storage_path,
            commands::config_cmd::migrate_bgm_files,
            is_backend_ready,
            restart_backend,
            freesound::search_freesound,
            freesound::get_freesound_sound,
            freesound::download_freesound_preview
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
