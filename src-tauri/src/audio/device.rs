use cpal::traits::{HostTrait, DeviceTrait};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AudioDevice {
    pub id: String,
    pub name: String,
}

pub fn get_all_output_devices() -> Vec<AudioDevice> {
    let mut devices = vec![AudioDevice {
        id: "default".to_string(),
        name: "系统默认".to_string(),
    }];

    let host = cpal::default_host();
    if let Ok(output_devices) = host.output_devices() {
        for (i, device) in output_devices.enumerate() {
            if let Ok(name) = device.name() {
                devices.push(AudioDevice {
                    id: format!("output_{}", i),
                    name,
                });
            }
        }
    }

    devices
}

pub fn get_all_input_devices() -> Vec<AudioDevice> {
    let mut devices = vec![AudioDevice {
        id: "default".to_string(),
        name: "系统默认".to_string(),
    }];

    let host = cpal::default_host();
    if let Ok(input_devices) = host.input_devices() {
        for (i, device) in input_devices.enumerate() {
            if let Ok(name) = device.name() {
                devices.push(AudioDevice {
                    id: format!("input_{}", i),
                    name,
                });
            }
        }
    }

    devices
}

pub fn get_output_device_by_id(device_id: &str) -> Option<cpal::Device> {
    if device_id == "default" || device_id.is_empty() {
        return cpal::default_host()
            .default_output_device();
    }

    let host = cpal::default_host();
    let devices: Vec<_> = host.output_devices().ok()?.collect();
    let index = device_id.strip_prefix("output_")?.parse::<usize>().ok()?;
    devices.into_iter().nth(index)
}

pub fn get_input_device_by_id(device_id: &str) -> Option<cpal::Device> {
    if device_id == "default" || device_id.is_empty() {
        return cpal::default_host()
            .default_input_device();
    }

    let host = cpal::default_host();
    let devices: Vec<_> = host.input_devices().ok()?.collect();
    let index = device_id.strip_prefix("input_")?.parse::<usize>().ok()?;
    devices.into_iter().nth(index)
}
