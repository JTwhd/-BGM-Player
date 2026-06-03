import { useState, useCallback, useEffect } from 'react';
import type { AudioDevice } from '../types';
import { 
  enableTeamAudio as enableTeamAudioApi, 
  disableTeamAudio as disableTeamAudioApi, 
  isTeamAudioEnabled, 
  setTeamAudioVolume as setTeamAudioVolumeApi,
  getTeamAudioStatus,
  getOutputDevices,
} from '../lib/tauri-api';

export function useVirtualMic() {
  const [isTeamAudioOn, setIsTeamAudioOn] = useState(false);
  const [teamAudioVolume, setTeamAudioVolumeState] = useState(0.7);
  const [currentTeamTrack, setCurrentTeamTrack] = useState<string | null>(null);
  const [virtualDevices, setVirtualDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const devices = await getOutputDevices();
      setVirtualDevices(devices);
      
      const virtualDevice = devices.find(d => 
        d.is_virtual || 
        d.name.toLowerCase().includes('cable') ||
        d.name.toLowerCase().includes('virtual') ||
        d.name.toLowerCase().includes('voicemeeter')
      );
      
      if (virtualDevice) {
        setSelectedDevice(virtualDevice.id);
      } else if (devices.length > 0) {
        setSelectedDevice(devices[0].id);
      }

      const status = await getTeamAudioStatus();
      setIsTeamAudioOn(status.enabled);
      setCurrentTeamTrack(status.current_track);
    } catch (err) {
      console.error('加载初始数据失败:', err);
      setError(`加载失败: ${err}`);
    }
  };

  const enableTeamAudio = useCallback(async (filePath: string) => {
    try {
      setError(null);
      await enableTeamAudioApi(filePath, selectedDevice);
      setIsTeamAudioOn(true);
      setCurrentTeamTrack(filePath);
      console.log('团队音频已启用');
    } catch (err) {
      console.error('启用团队音频失败:', err);
      setError(`启用失败: ${err}`);
      throw err;
    }
  }, [selectedDevice]);

  const disableTeamAudio = useCallback(async () => {
    try {
      setError(null);
      await disableTeamAudioApi();
      setIsTeamAudioOn(false);
      setCurrentTeamTrack(null);
      console.log('团队音频已禁用');
    } catch (err) {
      console.error('禁用团队音频失败:', err);
      setError(`禁用失败: ${err}`);
      throw err;
    }
  }, []);

  const setTeamAudioVolume = useCallback(async (volume: number) => {
    try {
      setError(null);
      await setTeamAudioVolumeApi(volume);
      setTeamAudioVolumeState(volume);
      console.log(`团队音频音量设置为: ${volume}`);
    } catch (err) {
      console.error('设置音量失败:', err);
      setError(`设置音量失败: ${err}`);
      throw err;
    }
  }, []);

  const checkTeamAudioStatus = useCallback(async () => {
    try {
      await isTeamAudioEnabled();
      const status = await getTeamAudioStatus();
      setIsTeamAudioOn(status.enabled);
      setCurrentTeamTrack(status.current_track);
      return status;
    } catch (err) {
      console.error('检查状态失败:', err);
      setError(`检查状态失败: ${err}`);
      return null;
    }
  }, []);

  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDevice(deviceId);
  }, []);

  return {
    isTeamAudioOn,
    teamAudioVolume,
    currentTeamTrack,
    virtualDevices,
    selectedDevice,
    error,
    enableTeamAudio,
    disableTeamAudio,
    setTeamAudioVolume,
    checkTeamAudioStatus,
    selectDevice,
    clearError: () => setError(null),
  };
}
