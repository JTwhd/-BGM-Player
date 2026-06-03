use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BgmTrack {
    pub id: String,
    pub name: String,
    pub path: String,
    pub category: BgmCategory,
    pub favorite: bool,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum BgmCategory {
    Victory,
    Defeat,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HotkeyConfig {
    pub victory_key: String,
    pub defeat_key: String,
    pub stop_key: String,
}

// 在线音乐库相关的数据结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OnlineTrack {
    pub id: String,
    pub name: String,
    pub category: BgmCategory,
    pub tags: Vec<String>,
    pub duration_secs: f32,
    pub preview_url: String,
    pub download_url: String,
    pub size_mb: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct ActivationInfo {
    pub activated: bool,
    pub activation_code: Option<String>,
    pub activated_at: Option<String>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub listen_volume: f32,
    pub output_volume: f32,
    pub audio_device: String,
    pub virtual_audio_device: String,
    pub use_virtual_device: bool,
    pub hotkeys: HotkeyConfig,
    pub tracks: Vec<BgmTrack>,
    pub ai_api_key: String,
    #[serde(default = "default_ai_api_url")]
    pub ai_api_url: String,
    pub ai_model: String,
    // 在线音乐库相关
    #[serde(default)]
    pub activation: ActivationInfo,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            listen_volume: 0.7,
            output_volume: 0.7,
            audio_device: "default".to_string(),
            virtual_audio_device: "".to_string(),
            use_virtual_device: false,
            hotkeys: HotkeyConfig {
                victory_key: "Numpad1".to_string(),
                defeat_key: "Numpad2".to_string(),
                stop_key: "Numpad0".to_string(),
            },
            tracks: Vec::new(),
            ai_api_key: String::new(),
            ai_api_url: default_ai_api_url(),
            ai_model: "deepseek-chat".to_string(),
            activation: ActivationInfo {
                activated: false,
                activation_code: None,
                activated_at: None,
                expires_at: None,
            },
        }
    }
}

fn default_ai_api_url() -> String {
    "https://api.deepseek.com/v1".to_string()
}
