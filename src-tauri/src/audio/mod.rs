pub mod device;
pub mod player;
pub mod loopback;

use std::sync::{Arc, Mutex};

use crate::config::AppConfig;
use player::AudioPlayer;
use loopback::VirtualMicManager;

static mut PLAYER: Option<Arc<AudioPlayer>> = None;
static mut VIRTUAL_MIC_MANAGER: Option<Arc<Mutex<VirtualMicManager>>> = None;
static mut CONFIG: Option<Arc<Mutex<AppConfig>>> = None;
static mut APP_HANDLE: Option<tauri::AppHandle> = None;

pub fn init_with_config(config: AppConfig) {
    let device_id = if config.use_virtual_device && !config.virtual_audio_device.is_empty() {
        &config.virtual_audio_device
    } else {
        &config.audio_device
    };
    
    let player = AudioPlayer::new(device_id, config.listen_volume, config.output_volume);
    let player = Arc::new(player);
    player.start_watcher();

    unsafe {
        PLAYER = Some(player);
        CONFIG = Some(Arc::new(Mutex::new(config)));
    }
}

pub fn reinit_player(device_id: &str, listen_volume: f32, output_volume: f32) {
    let player = AudioPlayer::new(device_id, listen_volume, output_volume);
    let player = Arc::new(player);
    player.start_watcher();

    unsafe {
        PLAYER = Some(player);
    }
    
    println!("[AUDIO] Player reinitialized with device: {}", device_id);
}

pub fn get_player() -> Option<Arc<AudioPlayer>> {
    unsafe { PLAYER.clone() }
}

pub fn get_config() -> Option<Arc<Mutex<AppConfig>>> {
    unsafe { CONFIG.clone() }
}

pub fn get_virtual_mic_manager() -> Option<Arc<Mutex<VirtualMicManager>>> {
    unsafe { VIRTUAL_MIC_MANAGER.clone() }
}

pub fn init_virtual_mic_manager() {
    unsafe {
        if VIRTUAL_MIC_MANAGER.is_none() {
            VIRTUAL_MIC_MANAGER = Some(Arc::new(Mutex::new(VirtualMicManager::new())));
            println!("[AUDIO] 虚拟麦克风管理器已初始化");
        }
    }
}

pub fn set_app_handle(handle: tauri::AppHandle) {
    unsafe {
        APP_HANDLE = Some(handle);
    }
}

pub fn get_app_handle() -> Option<tauri::AppHandle> {
    unsafe { APP_HANDLE.clone() }
}

