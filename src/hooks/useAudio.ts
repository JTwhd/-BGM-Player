import { useState, useCallback, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { playBgm, stopBgm, pauseBgm, resumeBgm, setOutputVolume, getConfig, getOutputDevices, getNowPlaying, playSpecificBgm } from '../lib/tauri-api';
import type { BgmTrack, AudioDevice } from '../types';

export function useAudio() {
  const [nowPlaying, setNowPlaying] = useState<BgmTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolumeState] = useState(0.7);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [lastHotkey, setLastHotkey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOutputDevices().then(setDevices);
    getConfig().then((config) => setVolumeState(Math.min(config.output_volume, 1)));
  }, []);

  useEffect(() => {
    let mounted = true;
    console.log('开始注册热键监听...');

    const unlistenPromise = listen<string>('hotkey-triggered', (event) => {
      if (!mounted) return;
      const scene = event.payload;
      console.log('✅ 收到热键:', scene);
      setLastHotkey(`${scene} @ ${new Date().toLocaleTimeString()}`);

      // Rust 已经执行了热键动作，这里只刷新界面，避免同一次按键重复播放或重复暂停。
      setIsPlaying(scene !== 'stop');
      getNowPlaying().then(setNowPlaying).catch((err) => {
        console.error('刷新播放状态失败:', err);
      });
    });

    return () => {
      mounted = false;
      unlistenPromise.then(unlisten => unlisten()).catch(() => {});
    };
  }, []);

  const handlePlay = useCallback(async (category: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await playBgm(category);
      console.log(result);
      setIsPlaying(true);
      const track = await getNowPlaying();
      setNowPlaying(track);
    } catch (err) {
      const msg = String(err);
      console.error('播放失败:', msg);
      setError(msg);
      setLastHotkey(`播放失败: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePause = useCallback(async () => {
    try {
      await pauseBgm();
      setIsPlaying(false);
      // 暂停后需要重新获取当前播放的歌曲（可能已经切换）
      const track = await getNowPlaying();
      setNowPlaying(track);
    } catch (err) {
      console.error('暂停失败:', err);
    }
  }, []);

  const handleStop = useCallback(async () => {
    try {
      await stopBgm();
      setIsPlaying(false);
      setNowPlaying(null);
    } catch (err) {
      console.error('停止失败:', err);
    }
  }, []);

  const handleResume = useCallback(async () => {
    try {
      await resumeBgm();
      setIsPlaying(true);
      const track = await getNowPlaying();
      setNowPlaying(track);
    } catch (err) {
      console.error('恢复播放失败:', err);
    }
  }, []);

  const handlePlaySpecific = useCallback(async (trackId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await playSpecificBgm(trackId);
      setIsPlaying(true);
      const track = await getNowPlaying();
      setNowPlaying(track);
    } catch (err) {
      const msg = String(err);
      console.error('播放失败:', msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSetOutputVolume = useCallback(async (newVolume: number) => {
    try {
      await setOutputVolume(newVolume);
      setVolumeState(newVolume);
    } catch (error) {
      console.error('设置音量失败:', error);
    }
  }, []);

  return {
    nowPlaying,
    isPlaying,
    isLoading,
    outputVolume: volume,
    devices,
    lastHotkey,
    error,
    play: handlePlay,
    pause: handlePause,
    stop: handleStop,
    resume: handleResume,
    playSpecific: handlePlaySpecific,
    setOutputVolume: handleSetOutputVolume,
  };
}
