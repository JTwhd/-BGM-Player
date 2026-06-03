use std::sync::atomic::{AtomicBool, AtomicI64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};
use std::ffi::c_void;
use tauri::Emitter;

static LL_HOOK_RUNNING: AtomicBool = AtomicBool::new(false);
static LL_HOOK_CONFIG: Mutex<Option<Arc<HotkeyConfig>>> = Mutex::new(None);
static LL_HOOK_THREAD_ID: Mutex<Option<u32>> = Mutex::new(None);
static LAST_TRIGGER_MS: AtomicI64 = AtomicI64::new(0);

// Windows constants
const WH_KEYBOARD_LL: i32 = 13;
const WM_KEYDOWN: u32 = 0x0100;
const WM_SYSKEYDOWN: u32 = 0x0104;
const WM_QUIT: u32 = 0x0012;

#[repr(C)]
#[derive(Clone, Copy)]
struct KBDLLHOOKSTRUCT {
    vk_code: u32,
    scan_code: u32,
    flags: u32,
    time: u32,
    dw_extra_info: usize,
}

#[repr(C)]
struct POINT { x: i32, y: i32 }

#[repr(C)]
struct MSG {
    hwnd: *mut c_void,
    message: u32,
    w_param: usize,
    l_param: isize,
    time: u32,
    pt: POINT,
}

type HHOOK = *mut c_void;
type HOOKPROC = unsafe extern "system" fn(i32, usize, isize) -> isize;

#[cfg(windows)]
mod win_api {
    use std::ffi::c_void;

    type HANDLE = *mut c_void;
    type DWORD = u32;
    type BOOL = i32;

    const HIGH_PRIORITY_CLASS: DWORD = 0x00000080;
    const THREAD_PRIORITY_TIME_CRITICAL: i32 = 15;

    #[link(name = "kernel32")]
    extern "system" {
        fn GetCurrentProcess() -> HANDLE;
        fn SetPriorityClass(hProcess: HANDLE, dwPriorityClass: DWORD) -> BOOL;
        fn GetCurrentThread() -> HANDLE;
        fn SetThreadPriority(hThread: HANDLE, nPriority: i32) -> BOOL;
        fn AvSetMmThreadCharacteristicsA(
            task_name: *const u8,
            task_index: *mut DWORD,
        ) -> HANDLE;
        fn SetThreadPriorityBoost(hThread: HANDLE, bDisablePriorityBoost: BOOL) -> BOOL;
    }

    pub fn boost_hook_thread_priority() {
        unsafe {
            let process = GetCurrentProcess();
            let _ = SetPriorityClass(process, HIGH_PRIORITY_CLASS);

            let thread = GetCurrentThread();
            let _ = SetThreadPriority(thread, THREAD_PRIORITY_TIME_CRITICAL);
            let _ = SetThreadPriorityBoost(thread, 0);

            let mut task_index: DWORD = 0;
            let task_name = b"Audio\0";
            let avrt_handle = AvSetMmThreadCharacteristicsA(
                task_name.as_ptr(),
                &mut task_index,
            );
            if !avrt_handle.is_null() {
                println!("[LL-HOOK] Thread registered with MMCSS 'Audio' (index={})", task_index);
            }

            println!("[LL-HOOK] Thread priority: TIME_CRITICAL");
        }
    }
}

extern "system" {
    fn SetWindowsHookExW(id_hook: i32, lpfn: HOOKPROC, h_mod: *mut c_void, thread_id: u32) -> HHOOK;
    fn UnhookWindowsHookEx(hhk: HHOOK) -> i32;
    fn CallNextHookEx(hhk: HHOOK, n_code: i32, w_param: usize, l_param: isize) -> isize;
    fn GetMessageW(msg: *mut MSG, hwnd: *mut c_void, filter_min: u32, filter_max: u32) -> i32;
    fn GetCurrentThreadId() -> u32;
    fn PostThreadMessageW(thread_id: u32, msg: u32, w_param: usize, l_param: isize) -> i32;
}

pub struct HotkeyConfig {
    pub victory_key: String,
    pub defeat_key: String,
    pub stop_key: String,
}

pub fn start_ll_hook(config: HotkeyConfig) {
    stop_ll_hook();

    let config = Arc::new(config);
    *LL_HOOK_CONFIG.lock().unwrap() = Some(config.clone());

    LL_HOOK_RUNNING.store(true, Ordering::SeqCst);

    thread::spawn(move || {
        #[cfg(windows)]
        {
            // Re-boost in case thread ID changed
            win_api::boost_hook_thread_priority();
        }
        ll_hook_thread(config);
    });
}

pub fn stop_ll_hook() {
    LL_HOOK_RUNNING.store(false, Ordering::SeqCst);
    if let Some(thread_id) = *LL_HOOK_THREAD_ID.lock().unwrap() {
        unsafe {
            // Wake GetMessageW so the previous hook is removed immediately.
            let _ = PostThreadMessageW(thread_id, WM_QUIT, 0, 0);
        }
    }
}

fn ll_hook_thread(_config: Arc<HotkeyConfig>) {
    unsafe {
        let thread_id = GetCurrentThreadId();
        *LL_HOOK_THREAD_ID.lock().unwrap() = Some(thread_id);

        let hook = SetWindowsHookExW(
            WH_KEYBOARD_LL,
            ll_keyboard_proc,
            std::ptr::null_mut(),
            0,
        );

        if hook.is_null() {
            eprintln!("[LL-HOOK ERROR] Failed to register low-level keyboard hook (requires admin rights)");
            clear_hook_thread_id(thread_id);
            return;
        }

        println!("[LL-HOOK] Low-level keyboard hook registered (works in-game)");

        // Message pump — keeps the hook alive.
        // Never exit on transient errors; only stop when LL_HOOK_RUNNING is false.
        let mut msg: MSG = std::mem::zeroed();
        while LL_HOOK_RUNNING.load(Ordering::SeqCst) {
            let ret = GetMessageW(&mut msg, std::ptr::null_mut(), 0, 0);
            if ret <= 0 {
                // Transient error (e.g. message queue interrupted) — retry
                break;
            }
            // ret == 0 (WM_QUIT) is also ignored — we stay alive
        }

        println!("[LL-HOOK] Shutting down...");
        UnhookWindowsHookEx(hook);
        clear_hook_thread_id(thread_id);
    }
}

fn clear_hook_thread_id(thread_id: u32) {
    let mut current_thread_id = LL_HOOK_THREAD_ID.lock().unwrap();
    if *current_thread_id == Some(thread_id) {
        *current_thread_id = None;
    }
}

unsafe extern "system" fn ll_keyboard_proc(
    n_code: i32,
    w_param: usize,
    l_param: isize,
) -> isize {
    if n_code >= 0 {
        let key_down = w_param as u32 == WM_KEYDOWN || w_param as u32 == WM_SYSKEYDOWN;

        if key_down {
            let kb = &*(l_param as *const KBDLLHOOKSTRUCT);
            let vk_code = kb.vk_code;
            let key_name = vk_to_name(vk_code);

            if let Ok(guard) = LL_HOOK_CONFIG.lock() {
                if let Some(ref cfg) = *guard {
                    if key_name == cfg.victory_key {
                        println!("[LL-HOOK] Victory key pressed: {}", key_name);
                        trigger_play("victory");
                    } else if key_name == cfg.defeat_key {
                        println!("[LL-HOOK] Defeat key pressed: {}", key_name);
                        trigger_play("defeat");
                    } else if key_name == cfg.stop_key {
                        println!("[LL-HOOK] Stop key pressed: {}", key_name);
                        trigger_stop();
                    }
                }
            }
        }
    }

    CallNextHookEx(std::ptr::null_mut(), n_code, w_param, l_param)
}

fn vk_to_name(vk: u32) -> String {
    match vk {
        0x61 => "Numpad1".into(),
        0x62 => "Numpad2".into(),
        0x63 => "Numpad3".into(),
        0x64 => "Numpad4".into(),
        0x65 => "Numpad5".into(),
        0x66 => "Numpad6".into(),
        0x67 => "Numpad7".into(),
        0x68 => "Numpad8".into(),
        0x69 => "Numpad9".into(),
        0x60 => "Numpad0".into(),
        0x6A => "NumpadMultiply".into(),
        0x6B => "NumpadAdd".into(),
        0x6D => "NumpadSubtract".into(),
        0x6E => "NumpadDecimal".into(),
        0x6F => "NumpadDivide".into(),
        _ => {
            if vk >= 0x30 && vk <= 0x39 {
                format!("Digit{}", vk - 0x30)
            } else if vk >= 0x41 && vk <= 0x5A {
                format!("{}", (vk as u8) as char)
            } else if vk >= 0x70 && vk <= 0x87 {
                format!("F{}", vk - 0x6F)
            } else {
                format!("VK_{}", vk)
            }
        }
    }
}

pub fn try_claim_hotkey() -> bool {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;
    let last = LAST_TRIGGER_MS.load(Ordering::SeqCst);
    if now - last < 500 {
        return false;
    }
    LAST_TRIGGER_MS.store(now, Ordering::SeqCst);
    true
}

fn trigger_play(category: &str) {
    if !try_claim_hotkey() {
        return;
    }
    if crate::commands::audio_cmd::play_bgm(category.to_string()).is_ok() {
        if let Some(app) = crate::audio::get_app_handle() {
            let _ = app.emit("hotkey-triggered", category);
        }
    }
}

fn trigger_stop() {
    if !try_claim_hotkey() {
        return;
    }
    if crate::commands::audio_cmd::pause_bgm().is_ok() {
        if let Some(app) = crate::audio::get_app_handle() {
            let _ = app.emit("hotkey-triggered", "stop");
        }
    }
}
