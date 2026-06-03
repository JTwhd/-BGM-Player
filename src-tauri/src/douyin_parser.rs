use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

const API_BASE_URL: &str = "http://localhost:18080";

#[derive(Debug, Deserialize)]
pub struct ExtractedAudioResponse {
    pub code: Option<i32>,
    pub data: Option<ExtractedAudioData>,
    pub message: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ExtractedAudioData {
    pub title: Option<String>,
    #[serde(rename = "audio_path")]
    pub audio_path: Option<String>,
    pub library: Option<String>,
    #[serde(rename = "file_size")]
    pub file_size: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct ExtractedAudio {
    pub title: String,
    pub audio_path: String,
}

pub async fn extract_douyin_with_bugpk(url: &str, save_path: &str) -> Result<ExtractedAudio, String> {
    println!("[EVIL0CTAL] 请求音频提取API: {} -> {}", url, save_path);

    let client = Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| format!("创建HTTP客户端失败: {}", e))?;

    let encoded_url = urlencoding::encode(url);
    let encoded_path = urlencoding::encode(save_path);
    let api_url = format!("{}/api/v1/douyin/extract_audio?url={}&save_dir={}", API_BASE_URL, encoded_url, encoded_path);

    println!("[EVIL0CTAL] GET请求到: {}", api_url);

    let response = client.get(&api_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36")
        .send()
        .await
        .map_err(|e| format!("请求API失败: {}", e))?;

    let status = response.status();
    println!("[EVIL0CTAL] 响应状态码: {}", status);

    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API返回错误状态码: {}, 错误信息: {}", status, error_text));
    }

    let response_text = response.text().await
        .map_err(|e| format!("读取响应失败: {}", e))?;

    println!("[EVIL0CTAL] 响应内容: {}", response_text);

    let api_response: ExtractedAudioResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("解析响应失败: {}", e))?;

    if let Some(code) = api_response.code {
        if code != 0 {
            let msg = api_response.message.clone().unwrap_or_else(|| "未知错误".to_string());
            return Err(format!("API错误 [{}]: {}", code, msg));
        }
    }

    let data = api_response.data.ok_or("API未返回数据")?;
    
    let title = data.title.unwrap_or_else(|| "抖音音频".to_string());
    let audio_path = data.audio_path.ok_or("API未返回音频路径")?;

    println!("[EVIL0CTAL] 音频提取成功: {} -> {}", title, audio_path);

    Ok(ExtractedAudio {
        title,
        audio_path,
    })
}

pub fn check_ffmpeg() -> Result<bool, String> {
    Ok(true)
}
