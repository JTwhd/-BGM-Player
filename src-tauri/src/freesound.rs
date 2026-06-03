use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const FREESOUND_API_URL: &str = "https://freesound.org/apiv2";
const USER_AGENT: &str = "ValorantBGMPlayer/1.0";

#[derive(Debug, Serialize, Deserialize)]
pub struct FreesoundResult {
    pub id: u32,
    pub name: String,
    pub duration: f32,
    pub preview_url: Option<String>,
    pub license: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct FreesoundSearchResponse {
    count: u32,
    results: Vec<FreesoundSound>,
}

#[derive(Debug, Deserialize)]
struct FreesoundSound {
    id: u32,
    name: String,
    duration: f32,
    previews: FreesoundPreviews,
    license: String,
    tags: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct FreesoundPreviews {
    #[serde(rename = "preview-hq-mp3")]
    preview_hq_mp3: Option<String>,
    #[serde(rename = "preview-lq-mp3")]
    preview_lq_mp3: Option<String>,
}

#[derive(Debug, Deserialize)]
struct FreesoundSoundDetail {
    id: u32,
    name: String,
    duration: f32,
    previews: FreesoundPreviews,
    license: String,
    tags: Vec<String>,
}

fn get_client() -> Client {
    Client::builder()
        .timeout(Duration::from_secs(30))
        .user_agent(USER_AGENT)
        .build()
        .unwrap_or_else(|_| Client::new())
}

async fn get_freesound_token(app: &AppHandle) -> Option<String> {
    app.store("config.json")
        .ok()?
        .get("freesound_token")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
}

#[tauri::command]
pub async fn search_freesound(
    app: AppHandle,
    query: String,
    page_size: Option<u32>,
    max_duration_secs: Option<f32>,
) -> Result<Vec<FreesoundResult>, String> {
    let token = get_freesound_token(&app).await;
    if token.is_none() {
        return Err("请先在设置中配置 Freesound API Token".to_string());
    }
    let token = token.unwrap();

    let client = get_client();
    let page_size = page_size.unwrap_or(10).min(50);

    let mut url = format!(
        "{}/search/text/?query={}&page_size={}&fields=id,name,duration,previews,tags,license",
        FREESOUND_API_URL, query, page_size
    );

    if let Some(max_dur) = max_duration_secs {
        url.push_str(&format!("&filter=duration:[0 TO {}]", max_dur));
    }

    let response = client
        .get(&url)
        .header("Authorization", format!("Token {}", token))
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Freesound API 错误 {}: {}", status, body));
    }

    let search_result: FreesoundSearchResponse =
        response.json().await.map_err(|e| format!("解析响应失败: {}", e))?;

    let results = search_result
        .results
        .into_iter()
        .map(|sound| FreesoundResult {
            id: sound.id,
            name: sound.name,
            duration: sound.duration,
            preview_url: sound.previews.preview_hq_mp3.or(sound.previews.preview_lq_mp3),
            license: sound.license,
            tags: sound.tags,
        })
        .collect();

    Ok(results)
}

#[tauri::command]
pub async fn get_freesound_sound(
    app: AppHandle,
    sound_id: u32,
) -> Result<FreesoundResult, String> {
    let token = get_freesound_token(&app).await;
    if token.is_none() {
        return Err("请先在设置中配置 Freesound API Token".to_string());
    }
    let token = token.unwrap();

    let client = get_client();
    let url = format!(
        "{}/sounds/{}/?fields=id,name,duration,previews,tags,license",
        FREESOUND_API_URL, sound_id
    );

    let response = client
        .get(&url)
        .header("Authorization", format!("Token {}", token))
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Freesound API 错误 {}: {}", status, body));
    }

    let sound: FreesoundSoundDetail =
        response.json().await.map_err(|e| format!("解析响应失败: {}", e))?;

    Ok(FreesoundResult {
        id: sound.id,
        name: sound.name,
        duration: sound.duration,
        preview_url: sound.previews.preview_hq_mp3.or(sound.previews.preview_lq_mp3),
        license: sound.license,
        tags: sound.tags,
    })
}

#[tauri::command]
pub async fn download_freesound_preview(
    app: AppHandle,
    sound_id: u32,
    save_path: String,
) -> Result<String, String> {
    let sound = get_freesound_sound(app, sound_id).await?;
    let preview_url = sound.preview_url.ok_or("该声音没有可用的预览文件")?;

    let client = get_client();
    let response = client
        .get(&preview_url)
        .send()
        .await
        .map_err(|e| format!("下载失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("下载失败: HTTP {}", response.status()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("读取文件失败: {}", e))?;

    std::fs::write(&save_path, &bytes).map_err(|e| format!("保存文件失败: {}", e))?;

    Ok(save_path)
}
