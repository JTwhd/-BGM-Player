use tauri::AppHandle;

#[tauri::command]
pub fn update_hotkeys(app_handle: AppHandle) -> Result<String, String> {
    if let Err(e) = crate::hotkey::register_hotkeys(&app_handle) {
        return Err(e);
    }

    // Also update the low-level hook config
    #[cfg(windows)]
    {
        if let Some(hk) = crate::audio::get_config()
            .and_then(|c| c.lock().ok().map(|g| g.hotkeys.clone()))
        {
            crate::hotkey_ll::start_ll_hook(crate::hotkey_ll::HotkeyConfig {
                victory_key: hk.victory_key,
                defeat_key: hk.defeat_key,
                stop_key: hk.stop_key,
            });
        }
    }

    Ok("快捷键已更新".to_string())
}