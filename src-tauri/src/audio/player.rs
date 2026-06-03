use std::sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}};
use rodio::{Decoder, OutputStream, Sink, Source};
use std::time::{Duration, Instant};
use cpal::traits::DeviceTrait;

use crate::config::BgmTrack;
use crate::audio::device;

struct SilentSource {
    sample_rate: u32,
    channels: u16,
}

impl Iterator for SilentSource {
    type Item = f32;

    fn next(&mut self) -> Option<Self::Item> {
        Some(0.0)
    }
}

impl Source for SilentSource {
    fn current_frame_len(&self) -> Option<usize> {
        None
    }

    fn channels(&self) -> u16 {
        self.channels
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }

    fn total_duration(&self) -> Option<Duration> {
        None
    }
}

struct MemorySource {
    samples: Vec<f32>,
    pos: usize,
    sample_rate: u32,
    channels: u16,
}

impl MemorySource {
    fn new(samples: Vec<f32>, sample_rate: u32, channels: u16) -> Self {
        Self {
            samples,
            pos: 0,
            sample_rate,
            channels,
        }
    }
}

impl Iterator for MemorySource {
    type Item = f32;

    fn next(&mut self) -> Option<Self::Item> {
        if self.pos < self.samples.len() {
            let sample = self.samples[self.pos];
            self.pos += 1;
            Some(sample)
        } else {
            None
        }
    }
}

impl Source for MemorySource {
    fn current_frame_len(&self) -> Option<usize> {
        None
    }

    fn channels(&self) -> u16 {
        self.channels
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }

    fn total_duration(&self) -> Option<Duration> {
        let seconds = self.samples.len() as f64 / (self.sample_rate as f64 * self.channels as f64);
        Some(Duration::from_secs_f64(seconds))
    }
}

pub struct AudioPlayer {
    virtual_sink: Arc<Mutex<Option<Sink>>>,
    _virtual_stream: Arc<Mutex<Option<(OutputStream, String)>>>,
    listen_sink: Arc<Mutex<Option<Sink>>>,
    _listen_stream: Arc<Mutex<Option<(OutputStream, String)>>>,
    listen_volume: Arc<Mutex<f32>>,
    output_volume: Arc<Mutex<f32>>,
    current_track: Arc<Mutex<Option<BgmTrack>>>,
    auto_advance: Arc<AtomicBool>,
    is_playing: Arc<AtomicBool>,                     // 是否正在播放
    // 新增：播放状态跟踪
    play_start_time: Arc<Mutex<Option<Instant>>>,      // 播放开始时间
    play_start_offset: Arc<Mutex<f32>>,                // 从音频中的哪个时间点开始播放
    pause_time: Arc<Mutex<Option<Instant>>>,           // 暂停时间
    current_track_index: Arc<Mutex<Option<usize>>>,    // 当前播放索引
    _output_device_id: String,
    _listen_device_id: String,
}

fn create_output_stream(device: &cpal::Device) -> Result<(OutputStream, rodio::OutputStreamHandle), String> {
    let supported_configs: Vec<_> = device
        .supported_output_configs()
        .map(|iter| iter.collect())
        .unwrap_or_default();

    let best_config = supported_configs.iter()
        .filter(|c| {
            c.min_sample_rate() <= cpal::SampleRate(48000)
                && c.max_sample_rate() >= cpal::SampleRate(48000)
        })
        .max_by_key(|c| c.channels())
        .map(|c| c.clone().with_sample_rate(cpal::SampleRate(48000)))
        .or_else(|| {
            supported_configs.iter()
                .filter(|c| {
                    c.min_sample_rate() <= cpal::SampleRate(44100)
                        && c.max_sample_rate() >= cpal::SampleRate(44100)
                })
                .max_by_key(|c| c.channels())
                .map(|c| c.clone().with_sample_rate(cpal::SampleRate(44100)))
        })
        .or_else(|| supported_configs.first().map(|c| c.clone().with_max_sample_rate()));

    match best_config {
        Some(config) => {
            println!(
                "[AUDIO] Stream config: {}Hz, {}ch (best quality)",
                config.sample_rate().0, config.channels()
            );
            OutputStream::try_from_device_config(device, config)
                .map_err(|e| format!("无法创建输出流: {}", e))
        }
        None => {
            println!("[AUDIO] Fallback to default stream");
            OutputStream::try_from_device(device)
                .map_err(|e| format!("无法创建输出流: {}", e))
        }
    }
}

impl AudioPlayer {
    pub fn new(output_device_id: &str, _listen_volume: f32, output_volume: f32) -> Self {
        let unified_volume = output_volume.clamp(0.0, 1.0);
        let (virtual_stream, virtual_stream_handle, virtual_device_name) = if let Some(device) = device::get_output_device_by_id(output_device_id) {
            let dev_name = device.name().unwrap_or_else(|_| "unknown".into());
            match create_output_stream(&device) {
                Ok((s, h)) => {
                    println!("[AUDIO] Virtual output created on: {}", dev_name);
                    (s, h, dev_name)
                }
                Err(e) => {
                    eprintln!("[AUDIO] Failed to create virtual stream: {}, falling back to default", e);
                    match OutputStream::try_default() {
                        Ok((s, h)) => (s, h, format!("default (fallback, err={})", e)),
                        Err(_) => panic!("No audio output available"),
                    }
                }
            }
        } else {
            let (s, h) = OutputStream::try_default()
                .expect("No default audio output device available");
            (s, h, "default".into())
        };

        let virtual_sink = Sink::try_new(&virtual_stream_handle).unwrap();
        let effective_gain = unified_volume;
        virtual_sink.set_volume(effective_gain);
        virtual_sink.append(SilentSource { sample_rate: 48000, channels: 2 });
        virtual_sink.play();

        let (listen_stream, listen_stream_handle, listen_device_name) = match OutputStream::try_default() {
            Ok((s, h)) => (Some(s), Some(h), "default listen".to_string()),
            Err(_) => (None, None, "none".to_string()),
        };

        let listen_sink = if let Some(handle) = listen_stream_handle.as_ref() {
            let sink = Sink::try_new(handle).ok();
            if let Some(ref s) = sink {
                s.set_volume(unified_volume);
                s.append(SilentSource { sample_rate: 48000, channels: 2 });
                s.play();
            }
            sink
        } else {
            None
        };

        println!("[AUDIO] Player initialized");
        println!("[AUDIO] Virtual device: {}, Listen device: {}", virtual_device_name, listen_device_name);
        println!("[AUDIO] Unified volume: {:.2}", unified_volume);

        Self {
            virtual_sink: Arc::new(Mutex::new(Some(virtual_sink))),
            _virtual_stream: Arc::new(Mutex::new(Some((virtual_stream, virtual_device_name)))),
            listen_sink: Arc::new(Mutex::new(listen_sink)),
            _listen_stream: Arc::new(Mutex::new(listen_stream.map(|s| (s, listen_device_name)))),
            listen_volume: Arc::new(Mutex::new(unified_volume)),
            output_volume: Arc::new(Mutex::new(unified_volume)),
            current_track: Arc::new(Mutex::new(None)),
            auto_advance: Arc::new(AtomicBool::new(true)),
            is_playing: Arc::new(AtomicBool::new(false)),
            // 新增：初始化播放状态跟踪
            play_start_time: Arc::new(Mutex::new(None)),
            play_start_offset: Arc::new(Mutex::new(0.0)),
            pause_time: Arc::new(Mutex::new(None)),
            current_track_index: Arc::new(Mutex::new(None)),
            _output_device_id: output_device_id.to_string(),
            _listen_device_id: "default".to_string(),
        }
    }
    
    pub fn is_playing(&self) -> bool {
        self.is_playing.load(Ordering::SeqCst)
    }

    pub fn play(&self, file_path: &str) -> Result<(), String> {
        self.play_from(file_path, 0.0)
    }

    pub fn play_from(&self, file_path: &str, start_time: f32) -> Result<(), String> {
        let data = std::fs::read(file_path).map_err(|e| format!("无法打开文件: {}", e))?;
        let start_time = start_time.max(0.0);

        // 记录播放开始时间
        {
            let mut start_time = self.play_start_time.lock().unwrap();
            *start_time = Some(Instant::now());
        }
        {
            let mut offset = self.play_start_offset.lock().unwrap();
            *offset = start_time;
        }
        
        // 清除暂停时间
        {
            let mut pause = self.pause_time.lock().unwrap();
            *pause = None;
        }
        
        // 设置播放状态为正在播放
        self.is_playing.store(true, Ordering::SeqCst);

        let output_vol = (*self.output_volume.lock().unwrap()).clamp(0.0, 1.0);
        let listen_vol = output_vol;

        // 只解码一次，然后创建两个独立的源（避免重复解码消耗资源和音质）
        let (source1, source2) = {
            let decoder = Decoder::new(std::io::Cursor::new(data))
                .map_err(|e| format!("解码失败: {}", e))?;

            let channels = decoder.channels();
            let sample_rate = decoder.sample_rate();
            println!(
                "[AUDIO] Source: {}Hz, {}ch, virtual output vol={:.2}",
                sample_rate, channels, output_vol
            );

            // 预解码到内存中，确保播放时的流畅性和一致性
            let samples: Vec<f32> = decoder
                .skip_duration(Duration::from_secs_f32(start_time))
                .convert_samples()
                .collect();
            let source1 = MemorySource::new(samples.clone(), sample_rate, channels);
            let source2 = MemorySource::new(samples, sample_rate, channels);
            (source1, source2)
        };

        {
            let mut sink = self.virtual_sink.lock().map_err(|_| "无法获取虚拟音频".to_string())?;
            if let Some(s) = sink.as_mut() {
                s.stop();
                s.set_volume(output_vol);
                s.append(source1);
                s.play();
            }
        }

        {
            let mut sink = self.listen_sink.lock().map_err(|_| "无法获取监听音频".to_string())?;
            if let Some(s) = sink.as_mut() {
                s.stop();
                s.set_volume(listen_vol);
                s.append(source2);
                s.play();
            }
        }

        println!("[AUDIO] Playing — output vol: {:.2}, listen vol: {:.2}", output_vol, listen_vol);
        Ok(())
    }

    pub fn get_playback_position(&self) -> f32 {
        let offset = *self.play_start_offset.lock().unwrap();
        if !self.is_playing() {
            return offset;
        }

        self.play_start_time
            .lock()
            .ok()
            .and_then(|started| started.map(|instant| offset + instant.elapsed().as_secs_f32()))
            .unwrap_or(offset)
    }

    fn advance_to_next_track(&self) -> bool {
        let category = {
            let track = self.current_track.lock().ok();
            track.and_then(|t| t.as_ref().map(|t| match t.category {
                crate::config::BgmCategory::Victory => "victory".to_string(),
                crate::config::BgmCategory::Defeat => "defeat".to_string(),
            }))
        };

        if let Some(cat) = category {
            let next_track = crate::audio::get_config().and_then(|cfg| {
                let cfg = cfg.lock().ok()?;
                let tracks: Vec<_> = cfg.tracks.iter()
                    .filter(|t| {
                        let tc = match t.category {
                            crate::config::BgmCategory::Victory => "victory",
                            crate::config::BgmCategory::Defeat => "defeat",
                        };
                        tc == cat
                    })
                    .collect();

                if tracks.is_empty() {
                    return None;
                }

                let current_idx = {
                    let guard = self.current_track_index.lock().ok()?;
                    *guard
                };

                let next_idx = match current_idx {
                    Some(idx) => if idx + 1 < tracks.len() { idx + 1 } else { 0 },
                    None => 0,
                };

                {
                    let mut guard = self.current_track_index.lock().ok()?;
                    *guard = Some(next_idx);
                }

                tracks.get(next_idx).map(|t| (*t).clone())
            });

            if let Some(track) = next_track {
                println!("[AUDIO] 切换到下一首: {}", track.name);
                self.set_current_track(track);
                return true;
            }
        }
        false
    }

    pub fn stop(&self, manual_stop: bool) {
        // 暂停时不自动切换下一首，让用户可以自由选择想播放的BGM
        // 只有歌曲自然播放完毕时才自动切换（在start_watcher中处理）
        
        // 设置播放状态为停止
        self.is_playing.store(false, Ordering::SeqCst);
        
        // 手动停止时清空播放开始时间
        if manual_stop {
            let mut start_time = self.play_start_time.lock().unwrap();
            *start_time = None;
        }

        println!("[AUDIO] 暂停播放，保持当前歌曲");

        // 记录暂停时间
        {
            let mut pause = self.pause_time.lock().unwrap();
            *pause = Some(Instant::now());
        }

        self.auto_advance.store(false, Ordering::SeqCst);

        if let Ok(mut sink) = self.virtual_sink.lock() {
            if let Some(s) = sink.as_mut() {
                s.stop();
                s.append(SilentSource { sample_rate: 48000, channels: 2 });
                s.play();
            }
        }

        if let Ok(mut sink) = self.listen_sink.lock() {
            if let Some(s) = sink.as_mut() {
                s.stop();
                s.append(SilentSource { sample_rate: 48000, channels: 2 });
                s.play();
            }
        }
    }

    pub fn resume(&self) -> Result<(), String> {
        if let Some(track) = self.get_current_track() {
            self.play(&track.path)
        } else {
            Err("没有当前播放的歌曲".to_string())
        }
    }

    pub fn is_auto_advance_enabled(&self) -> bool {
        self.auto_advance.load(Ordering::SeqCst)
    }

    pub fn enable_auto_advance(&self) {
        self.auto_advance.store(true, Ordering::SeqCst);
    }

    pub fn disable_auto_advance(&self) {
        self.auto_advance.store(false, Ordering::SeqCst);
    }

    pub fn start_watcher(self: &Arc<Self>) {
        let sink = self.virtual_sink.clone();
        // 完全禁用自动切换，只保持静默源填充
        std::thread::spawn(move || {
            loop {
                // 只负责在sink为空时添加静默源，不做任何自动切换
                if let Ok(mut guard) = sink.lock() {
                    if let Some(s) = guard.as_mut() {
                        if s.empty() {
                            s.append(SilentSource { sample_rate: 48000, channels: 2 });
                        }
                    }
                }
                std::thread::sleep(std::time::Duration::from_millis(500));
            }
        });
    }

    pub fn set_listen_volume(&self, volume: f32) {
        self.set_output_volume(volume);
    }

    pub fn set_output_volume(&self, volume: f32) {
        let volume = volume.clamp(0.0, 1.0);
        let mut vol = self.output_volume.lock().unwrap();
        *vol = volume;
        if let Ok(mut sink) = self.virtual_sink.lock() {
            if let Some(s) = sink.as_mut() {
                s.set_volume(volume);
            }
        }
        let listen_vol = volume;
        let mut listen_vol_guard = self.listen_volume.lock().unwrap();
        *listen_vol_guard = listen_vol;
        if let Ok(mut sink) = self.listen_sink.lock() {
            if let Some(s) = sink.as_mut() {
                s.set_volume(listen_vol);
            }
        }
        println!("[AUDIO] 音量已更新 - 输出: {:.2}, 本地监听: {:.2}", volume, listen_vol);
    }

    #[allow(dead_code)]
    pub fn get_listen_volume(&self) -> f32 {
        *self.listen_volume.lock().unwrap()
    }

    #[allow(dead_code)]
    pub fn get_output_volume(&self) -> f32 {
        *self.output_volume.lock().unwrap()
    }

    pub fn set_current_track(&self, track: BgmTrack) {
        if let Ok(mut t) = self.current_track.lock() {
            *t = Some(track);
        }
    }

    pub fn get_current_track(&self) -> Option<BgmTrack> {
        self.current_track.lock().ok()?.clone()
    }
    
    // 获取当前播放索引
    pub fn get_current_track_index(&self) -> Option<usize> {
        self.current_track_index.lock().ok().and_then(|g| *g)
    }
    
    // 设置当前播放索引
    pub fn set_current_track_index(&self, index: usize) {
        if let Ok(mut idx) = self.current_track_index.lock() {
            *idx = Some(index);
        }
    }
}
