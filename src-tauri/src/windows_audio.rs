// Windows audio optimizations for smooth background playback during gaming.
// Boosts process priority, registers with MMCSS (Multimedia Class Scheduler),
// and configures power/performance settings to prevent audio stutter and
// quality degradation when the system is under heavy GPU/CPU load.

use std::ffi::c_void;

#[cfg(windows)]
mod imp {
    use super::*;

    type HANDLE = *mut c_void;
    type DWORD = u32;
    type BOOL = i32;

    const HIGH_PRIORITY_CLASS: DWORD = 0x00000080;

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
        fn SetProcessInformation(
            hProcess: HANDLE,
            processInformationClass: u32,
            processInformation: *const c_void,
            processInformationSize: u32,
        ) -> BOOL;
    }

    const THREAD_PRIORITY_TIME_CRITICAL: i32 = 15;

    pub fn boost_audio_priority() {
        unsafe {
            let process = GetCurrentProcess();

            // Set process to HIGH priority class — ensures the audio thread gets
            // CPU time even when the game is maxing out all cores.
            if SetPriorityClass(process, HIGH_PRIORITY_CLASS) == 0 {
                eprintln!(
                    "[WINDOWS_AUDIO] SetPriorityClass failed: {}",
                    std::io::Error::last_os_error()
                );
            } else {
                println!("[WINDOWS_AUDIO] Process priority: HIGH");
            }

            // Register current thread with MMCSS "Audio" task.
            // "Audio" is more appropriate than "Pro Audio" for playback —
            // "Pro Audio" requires admin and is for DAWs/ASIO.
            // MMCSS gives our audio thread guaranteed GPU-like scheduling.
            let mut task_index: DWORD = 0;
            let task_name = b"Audio\0";
            let avrt_handle = AvSetMmThreadCharacteristicsA(
                task_name.as_ptr(),
                &mut task_index,
            );
            if avrt_handle.is_null() {
                // "Audio" may not be available — fall back to "Playback"
                let task_name = b"Playback\0";
                let handle = AvSetMmThreadCharacteristicsA(
                    task_name.as_ptr(),
                    &mut task_index,
                );
                if handle.is_null() {
                    eprintln!(
                        "[WINDOWS_AUDIO] MMCSS registration failed: {} (non-fatal)",
                        std::io::Error::last_os_error()
                    );
                } else {
                    println!("[WINDOWS_AUDIO] MMCSS registered as 'Playback' (index={})", task_index);
                }
            } else {
                println!("[WINDOWS_AUDIO] MMCSS registered as 'Audio' (index={})", task_index);
            }

            // Boost current thread to time-critical within MMCSS
            let thread = GetCurrentThread();
            SetThreadPriority(thread, THREAD_PRIORITY_TIME_CRITICAL);

            // Disable power throttling for this process.
            // Prevents Windows from downclocking the audio render thread
            // when it detects the game is the foreground app.
            disable_power_throttling();

            // Set multimedia scheduling to prefer high performance.
            // This tells Windows this is a multimedia process and should
            // be given scheduling priority alongside games.
            set_multimedia_scheduling();
        }
    }

    fn disable_power_throttling() {
        const PROCESS_POWER_THROTTLING_STATE: u32 = 4;
        const PROCESS_POWER_THROTTLING_EXECUTION_SPEED: u32 = 1;

        #[repr(C)]
        struct ProcessPowerThrottlingState {
            version: u32,
            control_mask: u32,
            state_mask: u32,
        }

        unsafe {
            let state = ProcessPowerThrottlingState {
                version: 1,
                control_mask: PROCESS_POWER_THROTTLING_EXECUTION_SPEED,
                state_mask: 0, // Disable throttling entirely
            };

            let result = SetProcessInformation(
                GetCurrentProcess(),
                PROCESS_POWER_THROTTLING_STATE,
                &state as *const _ as *const c_void,
                std::mem::size_of::<ProcessPowerThrottlingState>() as u32,
            );

            if result != 0 {
                println!("[WINDOWS_AUDIO] Power throttling: DISABLED");
            }
        }
    }

    fn set_multimedia_scheduling() {
        // Call timeBeginPeriod to increase the system timer resolution.
        // This allows Windows to schedule threads with ~1ms granularity
        // instead of the default ~15.6ms, dramatically reducing audio latency.
        #[link(name = "winmm")]
        extern "system" {
            fn timeBeginPeriod(uPeriod: u32) -> u32;
        }

        unsafe {
            // Request 1ms timer resolution for the lifetime of the process.
            // This is critical for low-latency audio during gaming.
            let result = timeBeginPeriod(1);
            if result == 0 {
                // TIMERR_NOERROR
                println!("[WINDOWS_AUDIO] Timer resolution: 1ms (high precision)");
            } else {
                eprintln!("[WINDOWS_AUDIO] timeBeginPeriod(1) returned {}", result);
            }
        }
    }
}

#[cfg(not(windows))]
mod imp {
    pub fn boost_audio_priority() {}
}

pub use imp::boost_audio_priority;
