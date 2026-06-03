use tauri::command;
use crate::audio::get_config;
use reqwest::blocking::Client;

const SYSTEM_PROMPT: &str = r#"你是一位资深BGM推荐大师，专精于为《无畏契约》(Valorant)玩家推荐背景音乐。

你的职责：
1. 根据游戏局势（胜利/失败）推荐最适合的背景音乐
2. 推荐的BGM要能精准匹配玩家当前的情绪状态
3. 推荐需要兼顾燃曲、电子、史诗、说唱、流行等多种风格
4. 给出真实的歌曲名称和艺术家

胜利时刻推荐方向：
- 高能量、激昂、庆祝氛围的歌曲
- 适合MVP结算画面的燃曲
- 让人热血沸腾的电音或说唱
- 传递"所向披靡"气势的战歌

失败时刻推荐方向：
- 有深度但不至于过于悲伤的歌曲
- 带有一丝不甘但又能激励再战的旋律
- 舒缓但不消沉，给予重新出发的力量
- 反思与成长主题的作品

你必须严格返回纯JSON数组，不要包含任何其他文字，格式如下：
[{"name":"歌曲名","artist":"艺术家","reason":"为什么适合当前局势的简短理由","tags":["标签1","标签2"]}]"#;

#[command]
pub fn get_ai_recommendation(category: String) -> Result<Vec<serde_json::Value>, String> {
    let config = get_config().ok_or("配置未初始化")?;
    let config = config.lock().map_err(|_| "无法获取配置")?;

    let api_key = config.ai_api_key.clone();
    let api_url = config.ai_api_url.clone();
    let model = config.ai_model.clone();

    drop(config);

    if api_key.is_empty() {
        return get_mock_recommendations(&category);
    }

    match call_openai_compatible_api(&api_url, &api_key, &model, &category) {
        Ok(recommendations) => Ok(recommendations),
        Err(error) => {
            eprintln!("[AI] API调用失败: {}，使用本地推荐", error);
            get_mock_recommendations(&category)
        }
    }
}

#[command]
pub fn test_ai_connection(api_url: String, api_key: String, model: String) -> Result<String, String> {
    if api_url.trim().is_empty() {
        return Err("请输入 API Base URL".to_string());
    }
    if api_key.trim().is_empty() {
        return Err("请输入 API Key".to_string());
    }
    if model.trim().is_empty() {
        return Err("请输入模型名称".to_string());
    }

    call_openai_compatible_api(&api_url, &api_key, &model, "victory")?;
    Ok("连接成功，可以使用该模型".to_string())
}

fn call_openai_compatible_api(api_url: &str, api_key: &str, model: &str, category: &str) -> Result<Vec<serde_json::Value>, String> {
    if api_url.trim().is_empty() {
        return Err("请输入 API Base URL".to_string());
    }
    if model.trim().is_empty() {
        return Err("请输入模型名称".to_string());
    }

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("创建客户端失败: {}", e))?;

    let scenario = if category == "victory" {
        "胜利局势：刚刚赢下一局比赛，MVP结算画面，需要高能量庆祝氛围的BGM"
    } else {
        "失败局势：刚刚输掉一局比赛，需要能平复心情但不消沉、重新激励斗志的BGM"
    };

    let user_prompt = format!(
        "请为以下游戏场景推荐5首BGM：{}。\n请推荐真实存在的歌曲，风格要多样化，每首歌给出15字以内的中文推荐理由。",
        scenario
    );

    let endpoint = build_chat_completions_url(api_url);
    let response = client
        .post(endpoint)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            "max_tokens": 1200,
            "temperature": 0.8
        }))
        .send()
        .map_err(|e| format!("API请求失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_default();
        return Err(format!("API返回错误 {}: {}", status, body));
    }

    let json: serde_json::Value = response.json().map_err(|e| format!("解析响应失败: {}", e))?;

    let content = json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or("响应格式错误")?;

    // Try direct JSON parse first
    if let Ok(recommendations) = serde_json::from_str::<Vec<serde_json::Value>>(content) {
        return Ok(recommendations);
    }

    // Fallback: extract JSON array from text
    if let Some(start) = content.find('[') {
        if let Some(end) = content.rfind(']') {
            let json_str = &content[start..=end];
            if let Ok(recommendations) = serde_json::from_str::<Vec<serde_json::Value>>(json_str) {
                return Ok(recommendations);
            }
        }
    }

    // Final fallback to mock
    get_mock_recommendations(category)
}

fn build_chat_completions_url(api_url: &str) -> String {
    let base_url = api_url.trim().trim_end_matches('/');
    if base_url.ends_with("/chat/completions") {
        base_url.to_string()
    } else {
        format!("{}/chat/completions", base_url)
    }
}

fn get_mock_recommendations(category: &str) -> Result<Vec<serde_json::Value>, String> {
    let recommendations = match category.to_lowercase().as_str() {
        "victory" => vec![
            serde_json::json!({"name": "Legends Never Die", "artist": "Against The Current", "reason": "英雄联盟经典战歌，胜利时刻的完美宣言", "tags": ["燃", "史诗", "战歌"]}),
            serde_json::json!({"name": "The Phoenix", "artist": "Fall Out Boy", "reason": "涅槃重生般的爆发力，冠军之魂在燃烧", "tags": ["摇滚", "爆发", "冠军"]}),
            serde_json::json!({"name": "Natural", "artist": "Imagine Dragons", "reason": "与生俱来的强者气场，碾压全场的霸气", "tags": ["摇滚", "霸气", "碾压"]}),
            serde_json::json!({"name": "Centuries", "artist": "Fall Out Boy", "reason": "名留青史的传奇时刻，你将成为传说", "tags": ["传奇", "史诗", "燃"]}),
            serde_json::json!({"name": "Believer", "artist": "Imagine Dragons", "reason": "痛苦让我更强大，胜利属于信念者", "tags": ["信念", "力量", "摇滚"]}),
        ],
        "defeat" => vec![
            serde_json::json!({"name": "Demons", "artist": "Imagine Dragons", "reason": "直视内心的脆弱，但不被其吞噬的勇气", "tags": ["内省", "力量", "摇滚"]}),
            serde_json::json!({"name": "Hall of Fame", "artist": "The Script", "reason": "失败是通往名人堂的必经之路", "tags": ["励志", "希望", "坚持"]}),
            serde_json::json!({"name": "Unstoppable", "artist": "Sia", "reason": "即使跌倒也无法被阻挡的重生之力", "tags": ["不屈", "重生", "力量"]}),
            serde_json::json!({"name": "Whatever It Takes", "artist": "Imagine Dragons", "reason": "不惜一切代价重新站起的决心", "tags": ["决心", "热血", "再战"]}),
            serde_json::json!({"name": "Rise", "artist": "League of Legends", "reason": "登峰造极之前总要经历低谷", "tags": ["崛起", "史诗", "激励"]}),
        ],
        _ => Vec::new(),
    };

    Ok(recommendations)
}
