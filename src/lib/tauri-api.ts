import { invoke } from '@tauri-apps/api/core';
import type { AppConfig, AudioDevice, AIRecommendation, BgmTrack } from '../types';

export interface FreesoundResult {
  id: number;
  name: string;
  duration: number;
  preview_url: string | null;
  license: string;
  tags: string[];
}

export async function playBgm(category: string): Promise<string> {
  return invoke('play_bgm', { category });
}

export async function playSpecificBgm(trackId: string): Promise<string> {
  return invoke('play_specific_bgm', { trackId: trackId });
}

export async function stopBgm(): Promise<string> {
  return invoke('stop_bgm');
}

export async function pauseBgm(): Promise<string> {
  return invoke('pause_bgm');
}

export async function resumeBgm(): Promise<string> {
  return invoke('resume_bgm');
}

export async function getNowPlaying(): Promise<BgmTrack | null> {
  return invoke('get_now_playing');
}

export async function playFilePreviewFrom(filePath: string, startTime: number): Promise<string> {
  return invoke('play_file_preview_from', { filePath, startTime });
}

export async function getPlaybackPosition(): Promise<number> {
  return invoke('get_playback_position');
}

export async function setVolume(volume: number): Promise<string> {
  return invoke('set_volume', { volume });
}

export interface VirtualAudioStatus {
  installed: boolean;
  has_cable_output: boolean;
  has_cable_input: boolean;
  output_device?: AudioDevice;
  input_device?: AudioDevice;
}

export async function getOutputDevices(): Promise<AudioDevice[]> {
  return invoke('get_output_devices');
}

export async function getInputDevices(): Promise<AudioDevice[]> {
  return invoke('get_input_devices');
}

export async function checkVirtualAudioDevice(): Promise<VirtualAudioStatus> {
  return invoke('check_virtual_audio_device');
}

export async function setOutputDevice(deviceId: string): Promise<string> {
  return invoke('set_output_device', { deviceId });
}

export async function setVirtualAudioDevice(deviceId: string, useVirtual: boolean): Promise<string> {
  return invoke('set_virtual_audio_device', { deviceId, useVirtual });
}

export async function setListenVolume(volume: number): Promise<string> {
  return invoke('set_listen_volume', { volume });
}

export async function setOutputVolume(volume: number): Promise<string> {
  return invoke('set_output_volume', { volume });
}

export async function addTrack(track: BgmTrack): Promise<string> {
  return invoke('add_track', { track });
}

export async function updateTrack(trackId: string, track: BgmTrack): Promise<string> {
  return invoke('update_track', { trackId, track });
}

export async function deleteTrack(trackId: string): Promise<string> {
  return invoke('delete_track', { trackId });
}

export async function renameTrack(trackId: string, newName: string): Promise<string> {
  return invoke('rename_track', { trackId, newName });
}

export async function toggleFavorite(trackId: string): Promise<string> {
  return invoke('toggle_favorite', { trackId });
}

export async function pickAudioFiles(): Promise<string[]> {
  return invoke('pick_audio_files');
}

export async function importJianyingBgm(folderPath: string): Promise<any[]> {
  return invoke('import_jianying_bgm', { folderPath });
}

export async function getConfig(): Promise<AppConfig> {
  return invoke('get_config');
}

export async function saveConfig(config: AppConfig): Promise<string> {
  return invoke('save_config', { config });
}

export async function exportConfig(): Promise<string> {
  return invoke('export_config');
}

export async function importConfig(): Promise<string> {
  return invoke('import_config');
}

export async function getAIRecommendation(category: string): Promise<AIRecommendation[]> {
  return invoke('get_ai_recommendation', { category });
}

export async function testAIConnection(apiUrl: string, apiKey: string, model: string): Promise<string> {
  return invoke('test_ai_connection', { apiUrl, apiKey, model });
}

export async function updateHotkeys(): Promise<string> {
  return invoke('update_hotkeys');
}

export async function autoClipBgm(
  inputPath: string,
  outputDir: string,
  clipDurationSecs?: number
): Promise<string[]> {
  return invoke('auto_clip_bgm', { inputPath, outputDir, clipDurationSecs });
}

export async function getStatus(): Promise<{
  bgm_service: boolean;
  audio_output: string;
  hotkeys_enabled: boolean;
  team_hearing: boolean;
}> {
  return invoke('get_status');
}

export async function searchFreesound(
  query: string,
  pageSize?: number,
  maxDurationSecs?: number
): Promise<FreesoundResult[]> {
  return invoke('search_freesound', { query, pageSize, maxDurationSecs });
}

export async function getFreesoundSound(soundId: number): Promise<FreesoundResult> {
  return invoke('get_freesound_sound', { soundId });
}

export async function downloadFreesoundPreview(
  soundId: number,
  savePath: string
): Promise<string> {
  return invoke('download_freesound_preview', { soundId, savePath });
}

export async function pickAudioFile(): Promise<string> {
  return invoke('pick_audio_file');
}

export async function testFfmpeg(): Promise<string> {
  return invoke('test_ffmpeg');
}

export async function getBuiltinFFmpegPath(): Promise<string> {
  return invoke('get_builtin_ffmpeg_path');
}

export async function pickDirectory(): Promise<string> {
  return invoke('pick_directory');
}

export async function deleteClipFile(path: string): Promise<string> {
  return invoke('delete_clip_file', { path });
}

export async function playFilePreview(filePath: string): Promise<string> {
  return invoke('play_file_preview', { filePath });
}

export async function saveOnlineAudio(fileName: string, bytes: number[]): Promise<string> {
  return invoke('save_online_audio', { fileName, bytes });
}

export interface TeamAudioStatus {
  enabled: boolean;
  current_track: string | null;
}

export async function enableTeamAudio(filePath: string, outputDevice: string): Promise<string> {
  return invoke('enable_team_audio', { filePath, outputDevice });
}

export async function disableTeamAudio(): Promise<string> {
  return invoke('disable_team_audio');
}

export async function isTeamAudioEnabled(): Promise<boolean> {
  return invoke('is_team_audio_enabled');
}

export async function setTeamAudioVolume(volume: number): Promise<string> {
  return invoke('set_team_audio_volume', { volume });
}

export async function getTeamAudioStatus(): Promise<TeamAudioStatus> {
  return invoke('get_team_audio_status');
}

// 抖音BGM提取相关
export interface DouyinExtractResult {
  success: boolean;
  title?: string;
  audio_path?: string;
  library?: string;
  error?: string;
}

export interface AddToLibraryResult {
  success: boolean;
  path?: string;
  message?: string;
  error?: string;
}

export async function extractDouyinAudio(url: string, savePath: string): Promise<DouyinExtractResult> {
  return invoke('extract_douyin_audio', { url, savePath });
}

export async function addAudioToLibrary(audioPath: string, title: string): Promise<AddToLibraryResult> {
  return invoke('add_audio_to_library', { audioPath, title });
}

// 手动剪辑相关
export async function manualClipAudio(
  inputPath: string,
  outputPath: string,
  startTime: number,
  endTime: number
): Promise<string> {
  return invoke('manual_clip_audio', { inputPath, outputPath, startTime, endTime });
}

export async function getAudioDuration(inputPath: string): Promise<number> {
  return invoke('get_audio_duration_cmd', { inputPath });
}

// BGM存储路径相关
export async function getBgmStoragePath(): Promise<string> {
  return invoke('get_bgm_storage_path');
}

export async function setBgmStoragePath(newPath: string): Promise<string> {
  return invoke('set_bgm_storage_path', { newPath });
}

export interface MigrateResult {
  success: boolean;
  migrated_count: number;
  message: string;
}

export async function migrateBgmFiles(): Promise<MigrateResult> {
  return invoke('migrate_bgm_files');
}

// 后端状态相关
export interface BackendStatus {
  ready: boolean;
  error?: string;
}

export async function isBackendReady(): Promise<BackendStatus> {
  return invoke('is_backend_ready');
}

export async function restartBackend(): Promise<string> {
  return invoke('restart_backend');
}

// 虚拟音频驱动相关
export async function checkVirtualAudioDriver(): Promise<boolean> {
  return invoke('check_virtual_audio_driver');
}

export async function installVirtualAudioDriver(): Promise<string> {
  return invoke('install_virtual_audio_driver');
}
