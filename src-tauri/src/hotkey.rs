use tauri::AppHandle;
use tauri::Emitter;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use std::sync::Mutex;

static SHORTCUT_IDS: Mutex<Vec<String>> = Mutex::new(Vec::new());

pub fn init(app_handle: &AppHandle) {
    println!("[HOTKEY] Initializing global hotkeys...");
    if let Err(e) = register_hotkeys(app_handle) {
        eprintln!("[HOTKEY ERROR] Failed to register hotkeys: {}", e);
    } else {
        println!("[HOTKEY] All hotkeys registered successfully!");
        println!("[HOTKEY] Press Numpad1 for Victory BGM");
        println!("[HOTKEY] Press Numpad2 for Defeat BGM");
        println!("[HOTKEY] Press Numpad3 to Stop");
    }
}

pub fn register_hotkeys(app_handle: &AppHandle) -> Result<(), String> {
    let config = crate::audio::get_config().ok_or("配置未初始化")?;
    let config = config.lock().map_err(|_| "无法获取配置")?;

    let mut ids = SHORTCUT_IDS.lock().unwrap();
    for id in ids.iter() {
        app_handle.global_shortcut().unregister(id.as_str()).ok();
    }
    ids.clear();

    let victory_key = config.hotkeys.victory_key.clone();
    let defeat_key = config.hotkeys.defeat_key.clone();
    let stop_key = config.hotkeys.stop_key.clone();
    drop(config);

    println!("[HOTKEY] Registering hotkeys:");
    println!("[HOTKEY]   Victory: {}", victory_key);
    println!("[HOTKEY]   Defeat: {}", defeat_key);
    println!("[HOTKEY]   Stop: {}", stop_key);

    let app_victory = app_handle.clone();
    let victory_result = app_handle.global_shortcut().on_shortcut(victory_key.as_str(), move |_app, _s, e| {
        if e.state == ShortcutState::Pressed {
            if !crate::hotkey_ll::try_claim_hotkey() {
                return;
            }
            println!("[HOTKEY] Victory key pressed!");
            match crate::commands::audio_cmd::play_bgm("victory".to_string()) {
                Ok(msg) => {
                    println!("[HOTKEY] Play success: {}", msg);
                    let _ = app_victory.emit("hotkey-triggered", "victory");
                }
                Err(err) => {
                    eprintln!("[HOTKEY ERROR] Play failed: {}", err);
                }
            };
        }
    });

    if victory_result.is_ok() {
        ids.push(victory_key.clone());
        println!("[HOTKEY] Victory hotkey registered: {}", victory_key);
    } else {
        return Err(format!("注册胜利快捷键失败: {}", victory_result.err().unwrap()));
    }

    let app_defeat = app_handle.clone();
    let defeat_result = app_handle.global_shortcut().on_shortcut(defeat_key.as_str(), move |_app, _s, e| {
        if e.state == ShortcutState::Pressed {
            if !crate::hotkey_ll::try_claim_hotkey() {
                return;
            }
            println!("[HOTKEY] Defeat key pressed!");
            match crate::commands::audio_cmd::play_bgm("defeat".to_string()) {
                Ok(msg) => {
                    println!("[HOTKEY] Play success: {}", msg);
                    let _ = app_defeat.emit("hotkey-triggered", "defeat");
                }
                Err(err) => {
                    eprintln!("[HOTKEY ERROR] Play failed: {}", err);
                }
            };
        }
    });

    if defeat_result.is_ok() {
        ids.push(defeat_key.clone());
        println!("[HOTKEY] Defeat hotkey registered: {}", defeat_key);
    } else {
        return Err(format!("注册失败快捷键失败: {}", defeat_result.err().unwrap()));
    }

    let app_stop = app_handle.clone();
    let stop_result = app_handle.global_shortcut().on_shortcut(stop_key.as_str(), move |_app, _s, e| {
        if e.state == ShortcutState::Pressed {
            if !crate::hotkey_ll::try_claim_hotkey() {
                return;
            }
            println!("[HOTKEY] Pause key pressed!");
            match crate::commands::audio_cmd::pause_bgm() {
                Ok(msg) => {
                    println!("[HOTKEY] Pause success: {}", msg);
                    let _ = app_stop.emit("hotkey-triggered", "stop");
                }
                Err(err) => {
                    eprintln!("[HOTKEY ERROR] Pause failed: {}", err);
                }
            };
        }
    });

    if stop_result.is_ok() {
        ids.push(stop_key.clone());
        println!("[HOTKEY] Stop hotkey registered: {}", stop_key);
    } else {
        return Err(format!("注册停止快捷键失败: {}", stop_result.err().unwrap()));
    }

    println!("[HOTKEY] All hotkeys are now active (global)");
    Ok(())
}
