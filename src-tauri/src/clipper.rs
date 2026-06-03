use std::path::Path;
use std::process::Command;
use std::collections::VecDeque;

pub fn find_ffmpeg_path() -> Result<String, String> {
    // First try: PATH lookup
    if Command::new("ffmpeg").arg("-version").output().map(|o| o.status.success()).unwrap_or(false) {
        return Ok("ffmpeg".to_string());
    }

    // Second try: common manual install paths
    let common_paths = [
        "C:\\ffmpeg\\bin\\ffmpeg.exe",
        "D:\\ffmpeg\\bin\\ffmpeg.exe",
        "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
        "C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe",
    ];

    for path in common_paths.iter() {
        if Path::new(path).exists() {
            return Ok(path.to_string());
        }
    }

    // Third try: search D:\ffmpeg and C:\ffmpeg for versioned dirs
    for base in ["D:\\ffmpeg", "C:\\ffmpeg"] {
        if let Ok(ffmpeg_dirs) = std::fs::read_dir(base) {
            for entry in ffmpeg_dirs.flatten() {
                let bin_path = entry.path().join("bin").join("ffmpeg.exe");
                if bin_path.exists() {
                    return Ok(bin_path.to_string_lossy().to_string());
                }
            }
        }
    }

    // Fourth try: WinGet install (most common on modern Windows)
    if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
        let winget_base = Path::new(&local_appdata)
            .join("Microsoft")
            .join("WinGet")
            .join("Packages");
        if let Ok(packages) = std::fs::read_dir(&winget_base) {
            for pkg in packages.flatten() {
                if let Ok(versions) = std::fs::read_dir(pkg.path()) {
                    for ver in versions.flatten() {
                        let bin = ver.path().join("bin").join("ffmpeg.exe");
                        if bin.exists() {
                            return Ok(bin.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
    }

    // Fifth try: search Program Files for any ffmpeg
    for prog_base in ["C:\\Program Files", "C:\\Program Files (x86)"] {
        if let Ok(entries) = std::fs::read_dir(prog_base) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_lowercase();
                if name.contains("ffmpeg") {
                    let bin = entry.path().join("bin").join("ffmpeg.exe");
                    if bin.exists() {
                        return Ok(bin.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    Err("请先安装 FFmpeg。\n\n安装方法：\n1. 打开 PowerShell 运行: winget install Gyan.FFmpeg\n2. 或下载: https://github.com/BtbN/FFmpeg-Builds/releases\n3. 解压到 C:\\ffmpeg 并确保 C:\\ffmpeg\\bin 在 PATH 中".to_string())
}

#[derive(Debug, Clone)]
struct EnergyPeak {
    time_sec: f64,
    energy: f64,
}

#[derive(Debug, Clone)]
struct BeatInfo {
    time_sec: f64,
    strength: f64,
}

pub struct AudioAnalyzer;

impl AudioAnalyzer {
    pub fn new() -> Self {
        Self
    }

    pub fn find_climax_segments(
        &self,
        input_path: &str,
        clip_duration: f64,
        ffmpeg_path: &str,
    ) -> Result<Vec<f64>, String> {
        let temp_pcm = Path::new(input_path).with_extension("tmp.pcm");
        
        // 使用传入的 ffmpeg_path 而不是自己查找
        let status = Command::new(ffmpeg_path)
            .arg("-y")
            .arg("-i")
            .arg(input_path)
            .arg("-f")
            .arg("f32le")
            .arg("-ar")
            .arg("44100")
            .arg("-ac")
            .arg("1")
            .arg(temp_pcm.to_str().unwrap())
            .status();
        
        status.map_err(|e| format!("FFmpeg 执行失败: {}", e))?;
        
        let pcm_data = std::fs::read(&temp_pcm)
            .map_err(|e| format!("读取PCM失败: {}", e))?;
        
        let sample_rate = 44100;
        let n_samples = pcm_data.len() / 4;
        let duration_sec = n_samples as f64 / sample_rate as f64;
        
        let frame_size = (sample_rate as f64 * 0.05) as usize;
        let hop_size = frame_size / 2;
        
        let mut energy_values = Vec::new();
        
        for i in (0..n_samples).step_by(hop_size) {
            let end = (i + frame_size).min(n_samples);
            let mut sum_sq = 0.0;
            
            for j in i..end {
                let sample_idx = j * 4;
                if sample_idx + 4 <= pcm_data.len() {
                    let sample_bytes = &pcm_data[sample_idx..sample_idx + 4];
                    let sample = f32::from_le_bytes([sample_bytes[0], sample_bytes[1], sample_bytes[2], sample_bytes[3]]);
                    sum_sq += (sample as f64) * (sample as f64);
                }
            }
            
            let rms = (sum_sq / (end - i) as f64).sqrt();
            energy_values.push(rms);
        }
        
        let frame_sec = hop_size as f64 / sample_rate as f64;
        
        let silence_boundaries = self.detect_silence_boundaries(&energy_values, frame_sec);
        
        let beats = self.detect_beats(&energy_values, frame_sec);
        
        let start_times = if energy_values.is_empty() {
            let start_time = (duration_sec / 2.0 - clip_duration / 2.0).max(0.0);
            vec![start_time]
        } else {
            let n_window_frames = (clip_duration / frame_sec).ceil() as usize;
            let peaks = self.find_rhythmic_peaks(&energy_values, &beats, frame_sec, n_window_frames, clip_duration, duration_sec);
            
            let mut start_times = Vec::with_capacity(peaks.len());
            for peak in peaks {
                let mut start_time = peak.time_sec - clip_duration / 2.0;
                start_time = start_time.max(0.0);
                
                start_time = self.snap_to_boundary(start_time, &silence_boundaries, 0.5);
                
                let end_time = start_time + clip_duration;
                if end_time <= duration_sec {
                    start_times.push(start_time);
                }
            }
            
            if start_times.is_empty() {
                let start_time = (duration_sec / 2.0 - clip_duration / 2.0).max(0.0);
                vec![start_time]
            } else {
                start_times.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
                start_times.dedup_by(|a, b| (*a - *b).abs() < clip_duration * 0.5);
                start_times
            }
        };
        
        let _ = std::fs::remove_file(&temp_pcm);
        
        Ok(start_times)
    }
    
    fn detect_silence_boundaries(&self, energy_values: &[f64], frame_sec: f64) -> Vec<f64> {
        let mut boundaries = Vec::new();
        
        let avg_energy: f64 = energy_values.iter().sum::<f64>() / energy_values.len() as f64;
        let silence_threshold = avg_energy * 0.15;
        
        let mut in_silence = false;
        
        for (i, &energy) in energy_values.iter().enumerate() {
            let time = i as f64 * frame_sec;
            
            if energy < silence_threshold && !in_silence {
                in_silence = true;
                boundaries.push(time);
            } else if energy >= silence_threshold && in_silence {
                in_silence = false;
                boundaries.push(time);
            }
        }
        
        boundaries.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        boundaries.dedup_by(|a, b| (*a - *b).abs() < 0.1);
        
        boundaries
    }
    
    fn snap_to_boundary(&self, time: f64, boundaries: &[f64], tolerance: f64) -> f64 {
        for &boundary in boundaries {
            if (time - boundary).abs() < tolerance {
                return boundary;
            }
        }
        
        if let Some(&first) = boundaries.first() {
            if time < first + tolerance {
                return first;
            }
        }
        
        time
    }
    
    fn detect_beats(&self, energy_values: &[f64], frame_sec: f64) -> Vec<BeatInfo> {
        if energy_values.len() < 10 {
            return Vec::new();
        }
        
        let mut beats = Vec::new();
        let mut energy_history = VecDeque::with_capacity(10);
        
        for (i, &energy) in energy_values.iter().enumerate() {
            energy_history.push_back(energy);
            if energy_history.len() > 10 {
                energy_history.pop_front();
            }
            
            if energy_history.len() >= 5 {
                let avg_energy: f64 = energy_history.iter().sum::<f64>() / energy_history.len() as f64;
                let variance: f64 = energy_history.iter().map(|&e| (e - avg_energy).powi(2)).sum::<f64>() / energy_history.len() as f64;
                let std_dev = variance.sqrt();
                
                let threshold = avg_energy + std_dev * 1.5;
                
                if energy > threshold && i > 0 && energy > energy_values[i - 1] * 1.3 {
                    beats.push(BeatInfo {
                        time_sec: i as f64 * frame_sec,
                        strength: energy - avg_energy,
                    });
                }
            }
        }
        
        beats.sort_by(|a, b| b.strength.partial_cmp(&a.strength).unwrap_or(std::cmp::Ordering::Equal));
        beats.into_iter().take(30).collect()
    }
    
    fn find_rhythmic_peaks(
        &self,
        energy_values: &[f64],
        beats: &[BeatInfo],
        frame_sec: f64,
        window_frames: usize,
        clip_duration: f64,
        total_duration: f64,
    ) -> Vec<EnergyPeak> {
        let window_frames = window_frames.min(energy_values.len());
        if window_frames == 0 || energy_values.is_empty() {
            return Vec::new();
        }
        
        let mut energy_sums = VecDeque::with_capacity(window_frames);
        let mut current_sum = 0.0;
        
        for i in 0..window_frames {
            let e = energy_values.get(i).copied().unwrap_or(0.0);
            energy_sums.push_back(e);
            current_sum += e;
        }
        
        let mut window_energies = vec![(0usize, current_sum / window_frames as f64)];
        
        for i in window_frames..energy_values.len() {
            let old_e = energy_sums.pop_front().unwrap_or(0.0);
            let new_e = energy_values[i];
            energy_sums.push_back(new_e);
            current_sum = current_sum - old_e + new_e;
            window_energies.push((i - window_frames + 1, current_sum / window_frames as f64));
        }
        
        let beat_times: Vec<f64> = beats.iter().map(|b| b.time_sec).collect();
        
        let mut scored_windows = Vec::new();
        for (idx, energy) in window_energies {
            let window_time = idx as f64 * frame_sec + window_frames as f64 * frame_sec / 2.0;
            
            let beat_count = beat_times.iter()
                .filter(|&&bt| bt >= window_time - clip_duration / 2.0 && bt <= window_time + clip_duration / 2.0)
                .count();
            
            let beat_score = beat_count as f64 * 10.0;
            let energy_score = energy;
            let position_score = if window_time > total_duration * 0.15 && window_time < total_duration * 0.85 {
                1.0
            } else {
                0.5
            };
            
            let total_score = (energy_score * 1000.0 + beat_score) * position_score;
            
            scored_windows.push((idx, energy, window_time, total_score));
        }
        
        scored_windows.sort_by(|a, b| b.3.partial_cmp(&a.3).unwrap_or(std::cmp::Ordering::Equal));
        
        let mut peaks = Vec::with_capacity(3);
        let mut used_ranges = std::collections::HashSet::new();
        
        for (_, energy, window_time, _) in scored_windows {
            let range_start = (window_time / frame_sec) as usize - window_frames / 2;
            let range_end = range_start + window_frames;
            
            let mut overlap = false;
            for used in &used_ranges {
                let (s, e) = used;
                if range_start < *e && range_end > *s {
                    overlap = true;
                    break;
                }
            }
            
            if !overlap {
                peaks.push(EnergyPeak {
                    time_sec: window_time,
                    energy,
                });
                used_ranges.insert((range_start, range_end));
                
                if peaks.len() >= 3 {
                    break;
                }
            }
        }
        
        peaks.sort_by(|a, b| b.energy.partial_cmp(&a.energy).unwrap_or(std::cmp::Ordering::Equal));
        peaks
    }
}

pub fn clip_with_ffmpeg(
    input_path: &str,
    output_dir: &str,
    start_times: &[f64],
    duration: f64,
    ffmpeg_path: &str,
) -> Result<Vec<String>, String> {
    let _ = std::fs::create_dir_all(output_dir);
    let output_dir = Path::new(output_dir);

    // 使用传入的 ffmpeg_path 而不是自己查找

    let input_path_obj = Path::new(input_path);
    let input_stem = input_path_obj.file_stem().unwrap_or_default().to_string_lossy();

    let mut output_paths = Vec::with_capacity(start_times.len());

    for (i, &start_time) in start_times.iter().enumerate() {
        let output_path = output_dir.join(format!("{}_clip_{}.mp3", input_stem, i + 1));
        let output_str = output_path.to_string_lossy().to_string();

        let status = Command::new(&ffmpeg_path)
            .arg("-y")
            .arg("-i")
            .arg(input_path)
            .arg("-ss")
            .arg(format!("{:.2}", start_time))
            .arg("-t")
            .arg(format!("{:.2}", duration))
            .arg("-q:a")
            .arg("2")
            .arg(&output_str)
            .status();

        match status {
            Ok(s) if s.success() => {
                output_paths.push(output_str);
            }
            Ok(s) => {
                eprintln!("[FFmpeg] clip {} failed with exit code: {:?}", i + 1, s.code());
            }
            Err(e) => {
                return Err(format!("执行 FFmpeg 失败: {}", e));
            }
        }
    }

    if output_paths.is_empty() {
        return Err("未能生成任何剪辑，请检查输入文件是否有效".to_string());
    }

    Ok(output_paths)
}

pub fn manual_clip_with_ffmpeg(
    input_path: &str,
    output_path: &str,
    start_time: f64,
    end_time: f64,
    ffmpeg_path: &str,
) -> Result<String, String> {
    let duration = end_time - start_time;
    if duration <= 0.0 {
        return Err("结束时间必须大于开始时间".to_string());
    }
    
    let _ = std::fs::create_dir_all(Path::new(output_path).parent().unwrap_or_else(|| Path::new(".")));

    let status = Command::new(&ffmpeg_path)
        .arg("-y")
        .arg("-i")
        .arg(input_path)
        .arg("-ss")
        .arg(format!("{:.2}", start_time))
        .arg("-t")
        .arg(format!("{:.2}", duration))
        .arg("-q:a")
        .arg("2")
        .arg(output_path)
        .status();

    match status {
        Ok(s) if s.success() => {
            Ok(output_path.to_string())
        }
        Ok(s) => {
            Err(format!("FFmpeg 执行失败，退出码: {:?}", s.code()))
        }
        Err(e) => {
            Err(format!("执行 FFmpeg 失败: {}", e))
        }
    }
}

pub fn get_audio_duration(input_path: &str, ffmpeg_path: &str) -> Result<f64, String> {
    let output = Command::new(&ffmpeg_path)
        .arg("-i")
        .arg(input_path)
        .arg("-f")
        .arg("null")
        .arg("-")
        .output()
        .map_err(|e| format!("FFmpeg 执行失败: {}", e))?;

    let stderr = String::from_utf8_lossy(&output.stderr);
    
    for line in stderr.lines() {
        if line.contains("Duration:") {
            let parts: Vec<&str> = line.split(',').collect();
            if let Some(duration_str) = parts.first() {
                let duration_str = duration_str.trim().replace("Duration: ", "");
                let parts: Vec<&str> = duration_str.split(':').collect();
                if parts.len() == 3 {
                    let hours: f64 = parts[0].parse().unwrap_or(0.0);
                    let minutes: f64 = parts[1].parse().unwrap_or(0.0);
                    let seconds: f64 = parts[2].parse().unwrap_or(0.0);
                    return Ok(hours * 3600.0 + minutes * 60.0 + seconds);
                }
            }
        }
    }

    Err("无法获取音频时长".to_string())
}
