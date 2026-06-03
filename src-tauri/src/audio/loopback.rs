use cpal::traits::{DeviceTrait, HostTrait};
use std::sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}};
use std::thread;
use std::io::BufReader;
use std::fs::File;
use rodio::Decoder;
use rodio::Source;

pub struct VirtualMicRouter {
    is_active: Arc<AtomicBool>,
    current_file: Arc<Mutex<Option<String>>>,
    output_volume: Arc<Mutex<f32>>,
}

impl VirtualMicRouter {
    pub fn new() -> Self {
        Self {
            is_active: Arc::new(AtomicBool::new(false)),
            current_file: Arc::new(Mutex::new(None)),
            output_volume: Arc::new(Mutex::new(0.7)),
        }
    }

    pub fn start(&self, file_path: &str, target_output_device: &str) -> Result<(), String> {
        if self.is_active.load(Ordering::SeqCst) {
            self.stop();
        }

        let is_active = self.is_active.clone();
        let current_file = self.current_file.clone();
        let output_volume = self.output_volume.clone();

        let file_path_owned = file_path.to_string();
        let target_device = target_output_device.to_string();

        is_active.store(true, Ordering::SeqCst);
        *current_file.lock().unwrap() = Some(file_path_owned.clone());

        thread::spawn(move || {
            println!("[VIRTUAL_MIC] 开始播放到虚拟设备: {}", file_path_owned);

            if let Err(e) = Self::play_to_device(&file_path_owned, &target_device, &is_active, &output_volume) {
                eprintln!("[VIRTUAL_MIC] 播放错误: {}", e);
            }

            is_active.store(false, Ordering::SeqCst);
            *current_file.lock().unwrap() = None;
            println!("[VIRTUAL_MIC] 播放线程结束");
        });

        Ok(())
    }

    fn play_to_device(
        file_path: &str,
        device_id: &str,
        is_active: &Arc<AtomicBool>,
        volume: &Arc<Mutex<f32>>,
    ) -> Result<(), String> {
        use rodio::{OutputStream, Sink};

        let file = File::open(file_path).map_err(|e| format!("无法打开文件: {}", e))?;
        let reader = BufReader::new(file);
        let source = Decoder::new(reader).map_err(|e| format!("解码失败: {}", e))?;

        let host = cpal::default_host();
        let device = if device_id == "default" || device_id.is_empty() {
            host.default_output_device()
        } else {
            let devices: Vec<_> = host.output_devices()
                .map_err(|e| format!("无法枚举设备: {}", e))?
                .collect();

            let index = device_id.strip_prefix("output_")
                .and_then(|s| s.parse::<usize>().ok());

            if let Some(idx) = index {
                devices.into_iter().nth(idx)
            } else {
                host.default_output_device()
            }
        }.ok_or("无法找到目标音频设备")?;

        // Build optimized stream config: pick best supported config for 48000Hz 2ch
        let supported_configs: Vec<_> = device
            .supported_output_configs()
            .map(|iter| iter.collect())
            .unwrap_or_default();

        let best_config = supported_configs.iter()
            .find(|c| {
                c.min_sample_rate() <= cpal::SampleRate(48000)
                    && c.max_sample_rate() >= cpal::SampleRate(48000)
                    && c.channels() >= 2
            })
            .map(|c| c.clone().with_sample_rate(cpal::SampleRate(48000)))
            .or_else(|| supported_configs.first().map(|c| c.clone().with_max_sample_rate()));

        let (_stream, stream_handle) = if let Some(config) = best_config {
            println!(
                "[VIRTUAL_MIC] Stream config: {}Hz, {}ch",
                config.sample_rate().0, config.channels()
            );
            OutputStream::try_from_device_config(&device, config)
        } else {
            OutputStream::try_from_device(&device)
        }
            .map_err(|e| format!("无法创建输出流: {}", e))?;

        let sink = Sink::try_new(&stream_handle)
            .map_err(|e| format!("无法创建音频接收器: {}", e))?;

        let vol = *volume.lock().unwrap();
        sink.set_volume(vol);

        let f32_source = source.convert_samples::<f32>();
        sink.append(f32_source);
        sink.play();

        while sink.empty() && is_active.load(Ordering::SeqCst) {
            thread::sleep(std::time::Duration::from_millis(100));
        }

        while !sink.empty() && is_active.load(Ordering::SeqCst) {
            sink.set_volume(*volume.lock().unwrap());
            thread::sleep(std::time::Duration::from_millis(50));
        }

        if !is_active.load(Ordering::SeqCst) {
            sink.stop();
        }

        Ok(())
    }

    pub fn stop(&self) {
        self.is_active.store(false, Ordering::SeqCst);
        println!("[VIRTUAL_MIC] 已停止");
    }

    pub fn is_active(&self) -> bool {
        self.is_active.load(Ordering::SeqCst)
    }

    pub fn set_volume(&self, vol: f32) {
        *self.output_volume.lock().unwrap() = vol.clamp(0.0, 1.0);
    }

    pub fn get_current_file(&self) -> Option<String> {
        self.current_file.lock().unwrap().clone()
    }
}

impl Default for VirtualMicRouter {
    fn default() -> Self {
        Self::new()
    }
}

pub struct VirtualMicManager {
    router: VirtualMicRouter,
}

impl VirtualMicManager {
    pub fn new() -> Self {
        Self {
            router: VirtualMicRouter::new(),
        }
    }

    pub fn enable_team_audio(&self, file_path: &str, output_device: &str) -> Result<(), String> {
        println!("[VIRTUAL_MIC] 启用团队音频 - 文件: {}, 设备: {}", file_path, output_device);
        self.router.start(file_path, output_device)
    }

    pub fn disable_team_audio(&self) {
        self.router.stop();
    }

    pub fn is_team_audio_enabled(&self) -> bool {
        self.router.is_active()
    }

    pub fn set_team_volume(&self, volume: f32) {
        self.router.set_volume(volume);
    }

    pub fn get_current_track(&self) -> Option<String> {
        self.router.get_current_file()
    }
}

impl Default for VirtualMicManager {
    fn default() -> Self {
        Self::new()
    }
}
