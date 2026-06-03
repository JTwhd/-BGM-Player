use tauri::command;
use crate::audio::{get_player, get_config, get_virtual_mic_manager};
use crate::audio::device::{get_all_output_devices, get_all_input_devices};
use crate::config::{BgmTrack, BgmCategory};
use crate::path_utils;
use std::fs;
use std::path::Path;
use std::path::PathBuf;

fn save_config_to_disk() -> Result<(), String> {
    let config = get_config().ok_or("配置未初始化")?;
    let config = config.lock().map_err(|_| "无法获取配置")?;
    
    let _ = path_utils::ensure_app_data_dir();
    let config_path = path_utils::get_config_path();
    
    let content = serde_json::to_string_pretty(&*config).map_err(|e| format!("序列化失败: {}", e))?;
    fs::write(&config_path, content).map_err(|e| format!("写入文件失败: {}", e))?;
    Ok(())
}

#[command]
pub fn play_bgm(category: String) -> Result<String, String> {
    println!("[AUDIO] play_bgm called with category: {}", category);
    
    let player = get_player().ok_or("播放器未初始化")?;
    println!("[AUDIO] 播放器已获取");

    let category = category.to_lowercase();
    let current_track = player.get_current_track();

    // 暂停后再次按下相同场景热键时恢复当前歌曲。
    // 只有在歌曲已经播放时再次按场景热键，才顺序切换到下一首。
    if !player.is_playing() {
        if let Some(current) = current_track.as_ref() {
            let current_category = match current.category {
                BgmCategory::Victory => "victory",
                BgmCategory::Defeat => "defeat",
            };

            if current_category == category {
                player.enable_auto_advance();
                player.resume()?;
                println!("[AUDIO] 恢复当前歌曲: {}", current.name);
                return Ok(format!("继续播放: {}", current.name));
            }
        }
    }

    let config = get_config().ok_or("配置未初始化")?;
    let config = config.lock().map_err(|_| "无法获取配置")?;
    println!("[AUDIO] 配置已获取，轨道数量: {}", config.tracks.len());
    
    let tracks: Vec<_> = config.tracks
        .iter()
        .filter(|t| {
            let track_cat = match t.category {
                BgmCategory::Victory => "victory",
                BgmCategory::Defeat => "defeat",
            };
            track_cat == category
        })
        .collect();
    
    println!("[AUDIO] 该分类下轨道数量: {}", tracks.len());
    
    if tracks.is_empty() {
        return Err("该分类下没有可用的BGM".to_string());
    }
    
    // 按当前歌曲 ID 推算下一首，避免在胜利、失败分类之间共享索引导致错位。
    // 正在播放时再次按分类热键，从当前歌曲切换到下一首。
    let next_idx = current_track
        .as_ref()
        .and_then(|current| tracks.iter().position(|track| track.id == current.id))
        .map(|idx| (idx + 1) % tracks.len())
        .unwrap_or(0);
    
    player.set_current_track_index(next_idx);
    let track = tracks.get(next_idx).ok_or("无法获取BGM")?;

    println!("[AUDIO] 顺序播放: {} - {} (索引: {})", track.name, track.path, next_idx);

    let track = (**track).clone();
    let path = track.path.clone();
    drop(config);

    if !Path::new(&path).exists() {
        return Err(format!("文件不存在: {}", path));
    }

    player.set_current_track(track.clone());
    player.enable_auto_advance();
    match player.play(&path) {
        Ok(_) => {
            println!("[AUDIO] 播放成功");
            Ok(format!("正在播放: {}", track.name))
        },
        Err(e) => {
            println!("[AUDIO] 播放失败: {}", e);
            Err(format!("播放失败: {}", e))
        }
    }
}

#[command]
pub fn play_file_preview(file_path: String) -> Result<String, String> {
    let player = get_player().ok_or("播放器未初始化")?;
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("文件不存在: {}", file_path));
    }
    player.play(&file_path)?;
    Ok(format!("正在预览: {}", file_path))
}

#[command]
pub fn save_online_audio(file_name: String, bytes: Vec<u8>) -> Result<String, String> {
    path_utils::ensure_music_dir()?;
    let requested_path = PathBuf::from(&file_name);
    let safe_name = requested_path
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .ok_or("Invalid audio file name")?;
    let file_path = path_utils::get_music_dir().join(safe_name);
    fs::write(&file_path, bytes).map_err(|e| format!("Failed to save audio file: {}", e))?;
    Ok(file_path.to_string_lossy().to_string())
}

#[command]
pub fn play_file_preview_from(file_path: String, start_time: f32) -> Result<String, String> {
    let player = get_player().ok_or("播放器未初始化")?;
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("文件不存在: {}", file_path));
    }
    player.play_from(&file_path, start_time)?;
    Ok(format!("从 {:.1} 秒开始预览", start_time))
}

#[command]
pub fn get_playback_position() -> Result<f32, String> {
    let player = get_player().ok_or("播放器未初始化")?;
    Ok(player.get_playback_position())
}

#[command]
pub fn play_specific_bgm(track_id: String) -> Result<String, String> {
    println!("[play_specific_bgm] 收到调用, track_id: {}", track_id);
    let player = get_player().ok_or("播放器未初始化")?;

    let config = get_config().ok_or("配置未初始化")?;
    let config = config.lock().map_err(|_| "无法获取配置")?;
    println!("[play_specific_bgm] 配置轨道数量: {}", config.tracks.len());

    let track = config.tracks.iter().find(|t| t.id == track_id)
        .ok_or("未找到指定的BGM")?.clone();
    println!("[play_specific_bgm] 找到轨道: {} - {}", track.name, track.path);
    drop(config);  // release lock before recording history

    if !Path::new(&track.path).exists() {
        return Err(format!("文件不存在: {}", track.path));
    }

    player.set_current_track(track.clone());
    player.disable_auto_advance();  // 禁用自动顺序播放，只播放指定的BGM
    match player.play(&track.path) {
        Ok(_) => {
            println!("[play_specific_bgm] 播放成功");
            Ok(format!("正在播放: {}", track.name))
        },
        Err(e) => {
            println!("[play_specific_bgm] 播放失败: {}", e);
            Err(format!("播放失败: {}", e))
        }
    }
}

#[command]
pub fn stop_bgm() -> Result<String, String> {
    let player = get_player().ok_or("播放器未初始化")?;
    player.stop(true);  // 手动停止，不触发自动切歌
    Ok("已停止播放".to_string())
}

#[command]
pub fn pause_bgm() -> Result<String, String> {
    let player = get_player().ok_or("播放器未初始化")?;
    player.stop(false);  // 暂停，可能触发自动切歌
    Ok("已暂停播放".to_string())
}

#[command]
pub fn resume_bgm() -> Result<String, String> {
    let player = get_player().ok_or("播放器未初始化")?;
    if let Some(track) = player.get_current_track() {
        player.enable_auto_advance();  // 恢复播放时重新启用自动切换
        match player.resume() {
            Ok(_) => Ok(format!("继续播放: {}", track.name)),
            Err(e) => Err(format!("继续播放失败: {}", e)),
        }
    } else {
        Err("没有当前播放的歌曲".to_string())
    }
}

#[command]
pub fn get_now_playing() -> Result<Option<serde_json::Value>, String> {
    let player = get_player().ok_or("播放器未初始化")?;
    let track = player.get_current_track();
    Ok(track.map(|t| serde_json::json!({
        "id": t.id,
        "name": t.name,
        "path": t.path,
        "category": match t.category {
            BgmCategory::Victory => "victory",
            BgmCategory::Defeat => "defeat",
        },
        "favorite": t.favorite,
        "tags": t.tags,
    })))
}

#[command]
pub fn set_listen_volume(volume: f32) -> Result<String, String> {
    let volume = volume.clamp(0.0, 1.0);
    let player = get_player().ok_or("播放器未初始化")?;
    player.set_listen_volume(volume);
    
    let config = get_config().ok_or("配置未初始化")?;
    let mut config = config.lock().map_err(|_| "无法获取配置")?;
    config.listen_volume = volume;
    config.output_volume = volume;

    if let Some(manager) = get_virtual_mic_manager() {
        if let Ok(manager) = manager.lock() {
            manager.set_team_volume(volume);
        }
    }
    
    drop(config);
    save_config_to_disk()?;
    
    Ok(format!("监听音量已设置为: {}", volume))
}

#[command]
pub fn set_output_volume(volume: f32) -> Result<String, String> {
    let volume = volume.clamp(0.0, 1.0);
    let player = get_player().ok_or("播放器未初始化")?;
    player.set_output_volume(volume);
    
    let config = get_config().ok_or("配置未初始化")?;
    let mut config = config.lock().map_err(|_| "无法获取配置")?;
    config.output_volume = volume;
    config.listen_volume = volume;

    if let Some(manager) = get_virtual_mic_manager() {
        if let Ok(manager) = manager.lock() {
            manager.set_team_volume(volume);
        }
    }
    
    drop(config);
    save_config_to_disk()?;
    
    Ok(format!("输出音量已设置为: {}", volume))
}

#[command]
pub fn get_output_devices() -> Result<Vec<serde_json::Value>, String> {
    let devices = get_all_output_devices();
    let result = devices.into_iter()
        .map(|d| serde_json::json!({
            "id": d.id,
            "name": d.name,
            "is_virtual": d.name.to_lowercase().contains("cable") || 
                          d.name.to_lowercase().contains("virtual") ||
                          d.name.to_lowercase().contains("虚拟") ||
                          d.name.to_lowercase().contains("voicemeeter"),
        }))
        .collect();
    Ok(result)
}

#[command]
pub fn get_input_devices() -> Result<Vec<serde_json::Value>, String> {
    let devices = get_all_input_devices();
    let result = devices.into_iter()
        .map(|d| serde_json::json!({
            "id": d.id,
            "name": d.name,
            "is_virtual": d.name.to_lowercase().contains("cable") || 
                          d.name.to_lowercase().contains("virtual") ||
                          d.name.to_lowercase().contains("虚拟") ||
                          d.name.to_lowercase().contains("voicemeeter"),
        }))
        .collect();
    Ok(result)
}

#[command]
pub fn check_virtual_audio_device() -> Result<serde_json::Value, String> {
    let output_devices = get_all_output_devices();
    let input_devices = get_all_input_devices();
    
    let is_voicemeeter = |name: &str| {
        name.to_lowercase().contains("voicemeeter")
    };
    
    let is_cable = |name: &str| {
        name.to_lowercase().contains("cable") || 
        name.to_lowercase().contains("virtual") ||
        name.to_lowercase().contains("虚拟")
    };
    
    let is_virtual_output = |name: &str| is_cable(name) || is_voicemeeter(name);
    let is_virtual_input = |name: &str| is_cable(name) || is_voicemeeter(name);
    
    let has_virtual_output = output_devices.iter().any(|d| is_virtual_output(&d.name));
    let has_virtual_input = input_devices.iter().any(|d| is_virtual_input(&d.name));
    
    let virtual_output_device = output_devices.iter()
        .find(|d| is_virtual_output(&d.name))
        .cloned();
    
    let virtual_input_device = input_devices.iter()
        .find(|d| is_virtual_input(&d.name))
        .cloned();
    
    Ok(serde_json::json!({
        "installed": has_virtual_output && has_virtual_input,
        "has_cable_output": has_virtual_output,
        "has_cable_input": has_virtual_input,
        "output_device": virtual_output_device.map(|d| serde_json::json!({
            "id": d.id,
            "name": d.name,
        })),
        "input_device": virtual_input_device.map(|d| serde_json::json!({
            "id": d.id,
            "name": d.name,
        })),
    }))
}

#[command]
pub fn set_output_device(device_id: String) -> Result<String, String> {
    let config = get_config().ok_or("配置未初始化")?;
    let mut config = config.lock().map_err(|_| "无法获取配置")?;
    let listen_volume = config.listen_volume;
    let output_volume = config.output_volume;
    config.audio_device = device_id.clone();
    
    drop(config);
    save_config_to_disk()?;
    
    crate::audio::reinit_player(&device_id, listen_volume, output_volume);
    
    Ok(format!("音频输出设备已设置为: {}", device_id))
}

#[command]
pub fn set_virtual_audio_device(device_id: String, use_virtual: bool) -> Result<String, String> {
    let config = get_config().ok_or("配置未初始化")?;
    let mut config = config.lock().map_err(|_| "无法获取配置")?;
    let listen_volume = config.listen_volume;
    let output_volume = config.output_volume;
    let audio_device = config.audio_device.clone();
    config.virtual_audio_device = device_id.clone();
    config.use_virtual_device = use_virtual;
    
    drop(config);
    save_config_to_disk()?;
    
    let target_device = if use_virtual && !device_id.is_empty() {
        device_id.clone()
    } else {
        audio_device
    };
    
    crate::audio::reinit_player(&target_device, listen_volume, output_volume);
    
    Ok(format!("虚拟音频设备{}已设置为: {}", if use_virtual { "启用并" } else { "禁用，" }, device_id))
}

#[command]
pub fn add_track(track: serde_json::Value) -> Result<String, String> {
    let track: BgmTrack = serde_json::from_value(track).map_err(|e| format!("解析轨道数据失败: {}", e))?;
    
    // 确保音乐目录存在
    let _ = crate::path_utils::ensure_music_dir();
    let music_dir = crate::path_utils::get_music_dir();
    
    // 生成新的文件名（使用时间戳避免重名）
    let extension = std::path::Path::new(&track.path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("mp3");
    let new_file_name = format!("{}_{}.{}", 
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
        track.name.replace(|c: char| !c.is_alphanumeric() && c != ' ' && c != '-' && c != '_', ""),
        extension
    );
    let new_path = music_dir.join(&new_file_name);
    
    // 复制文件到程序目录
    println!("[ADD_TRACK] 复制文件从 {} 到 {:?}", track.path, new_path);
    std::fs::copy(&track.path, &new_path)
        .map_err(|e| format!("复制文件失败: {}", e))?;
    
    // 创建新的轨道信息，使用新的文件路径
    let mut new_track = track.clone();
    new_track.path = new_path.to_string_lossy().to_string();
    
    let config = get_config().ok_or("配置未初始化")?;
    let mut config = config.lock().map_err(|_| "无法获取配置")?;
    config.tracks.push(new_track.clone());
    
    drop(config);
    save_config_to_disk()?;
    
    Ok(format!("已添加BGM: {} (已保存到程序目录)", new_track.name))
}

#[command]
pub fn update_track(track_id: String, track: serde_json::Value) -> Result<String, String> {
    let config = get_config().ok_or("配置未初始化")?;
    let updated_track: BgmTrack = serde_json::from_value(track).map_err(|e| format!("解析轨道数据失败: {}", e))?;
    
    let mut config = config.lock().map_err(|_| "无法获取配置")?;
    
    if let Some(existing) = config.tracks.iter_mut().find(|t| t.id == track_id) {
        *existing = updated_track.clone();
    } else {
        return Err("未找到指定的BGM".to_string());
    }
    
    drop(config);
    save_config_to_disk()?;
    
    Ok(format!("已更新BGM: {}", updated_track.name))
}

#[command]
pub fn rename_track(track_id: String, new_name: String) -> Result<String, String> {
    let config = get_config().ok_or("配置未初始化")?;
    let mut config = config.lock().map_err(|_| "无法获取配置")?;

    let track = config.tracks.iter_mut().find(|t| t.id == track_id)
        .ok_or("未找到指定的BGM")?;
    let old_name = track.name.clone();
    track.name = new_name.clone();

    drop(config);
    save_config_to_disk()?;

    Ok(format!("已重命名: {} → {}", old_name, new_name))
}

#[command]
pub fn delete_track(track_id: String) -> Result<String, String> {
    let config = get_config().ok_or("配置未初始化")?;
    
    let mut config = config.lock().map_err(|_| "无法获取配置")?;
    
    let track_name = config.tracks.iter().find(|t| t.id == track_id).map(|t| t.name.clone());
    config.tracks.retain(|t| t.id != track_id);
    
    drop(config);
    save_config_to_disk()?;
    
    Ok(format!("已删除BGM: {}", track_name.unwrap_or_else(|| "未知".to_string())))
}

#[command]
pub fn toggle_favorite(track_id: String) -> Result<String, String> {
    let config = get_config().ok_or("配置未初始化")?;
    
    let mut config = config.lock().map_err(|_| "无法获取配置")?;
    
    let track = config.tracks.iter_mut().find(|t| t.id == track_id)
        .ok_or("未找到指定的BGM")?;
    
    track.favorite = !track.favorite;
    let track_name = track.name.clone();
    let is_favorite = track.favorite;
    
    drop(config);
    save_config_to_disk()?;
    
    Ok(if is_favorite {
        format!("已收藏: {}", track_name)
    } else {
        format!("已取消收藏: {}", track_name)
    })
}

#[command]
pub fn import_jianying_bgm(folder_path: String) -> Result<Vec<serde_json::Value>, String> {
    let config = get_config().ok_or("配置未初始化")?;
    let path = Path::new(&folder_path);
    
    if !path.exists() {
        return Err("文件夹不存在".to_string());
    }
    
    let mut imported_tracks = Vec::new();
    let audio_extensions = ["mp3", "wav", "flac", "ogg", "aac", "m4a"];
    
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(file_type) = entry.file_type() {
                if file_type.is_file() {
                    if let Some(extension) = entry.path().extension() {
                        if let Some(ext_str) = extension.to_str() {
                            if audio_extensions.contains(&ext_str.to_lowercase().as_str()) {
                                let file_path = entry.path().to_string_lossy().to_string();
                                let file_name = entry.file_name().to_string_lossy().to_string();
                                let name = file_name.split('.').next().unwrap_or(&file_name).to_string();
                                let id = format!("track_{}", uuid::Uuid::new_v4().to_string().replace("-", ""));
                                
                                imported_tracks.push(serde_json::json!({
                                    "id": id,
                                    "name": name,
                                    "path": file_path,
                                    "category": "victory",
                                    "favorite": false,
                                    "tags": ["剪映"]
                                }));
                            }
                        }
                    }
                }
            }
        }
    }
    
    let mut config = config.lock().map_err(|_| "无法获取配置")?;
    for track_json in imported_tracks.iter() {
        if let Ok(track) = serde_json::from_value::<BgmTrack>(track_json.clone()) {
            config.tracks.push(track);
        }
    }
    
    drop(config);
    save_config_to_disk()?;
    
    Ok(imported_tracks)
}

#[command]
pub fn get_status() -> Result<serde_json::Value, String> {
    let player = get_player();
    let is_playing = player.as_ref().map(|p| p.get_current_track().is_some()).unwrap_or(false);
    
    let config = get_config();
    let audio_device = config.as_ref().and_then(|c| c.lock().ok()).map(|c| c.audio_device.clone()).unwrap_or_else(|| "未知".to_string());
    
    let hotkeys_enabled = true;
    
    let team_hearing = {
        let manager = get_virtual_mic_manager();
        if let Some(m) = manager {
            if let Ok(guard) = m.lock() {
                guard.is_team_audio_enabled()
            } else {
                false
            }
        } else {
            false
        }
    };
    
    Ok(serde_json::json!({
        "bgm_service": is_playing,
        "audio_output": audio_device,
        "hotkeys_enabled": hotkeys_enabled,
        "team_hearing": team_hearing,
    }))
}
