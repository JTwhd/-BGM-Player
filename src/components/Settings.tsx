import { useState, useEffect } from 'react';
import { getOutputDevices, setOutputDevice, setVirtualAudioDevice, setOutputVolume, getConfig, saveConfig, checkVirtualAudioDevice, testAIConnection } from '../lib/tauri-api';
import type { AudioDevice } from '../types';
import type { VirtualAudioStatus } from '../lib/tauri-api';
import { AnimatedLayerButton } from './ui/animated-layer-button';

const aiProviders = [
  { id: 'deepseek', name: 'DeepSeek', apiUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { id: 'openai', name: 'OpenAI', apiUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini' },
  { id: 'dashscope', name: '阿里云百炼', apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { id: 'siliconflow', name: '硅基流动', apiUrl: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' },
  { id: 'custom', name: '自定义 / 中转站', apiUrl: '', model: '' },
];

export function Settings() {
  const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([]);
  const [selectedOutputDevice, setSelectedOutputDevice] = useState('default');
  const [virtualDevices, setVirtualDevices] = useState<AudioDevice[]>([]);
  const [selectedVirtualDevice, setSelectedVirtualDevice] = useState('');
  const [useVirtualDevice, setUseVirtualDevice] = useState(false);
  const [outputVolume, setOutputVolumeState] = useState(0.5);
  const [virtualStatus, setVirtualStatus] = useState<VirtualAudioStatus | null>(null);
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiApiUrl, setAiApiUrl] = useState('https://api.deepseek.com/v1');
  const [aiModel, setAiModel] = useState('deepseek-chat');
  const [aiProvider, setAiProvider] = useState('deepseek');
  const [aiTestStatus, setAiTestStatus] = useState('');
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [freesoundToken, setFreesoundToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const [outputs, config, status] = await Promise.all([
        getOutputDevices(),
        getConfig(),
        checkVirtualAudioDevice(),
      ]);
      setOutputDevices(outputs);
      setVirtualDevices(outputs.filter(d => d.is_virtual));
      setSelectedOutputDevice(config.audio_device);
      setSelectedVirtualDevice(config.virtual_audio_device || '');
      setUseVirtualDevice(config.use_virtual_device || false);
      setOutputVolumeState(Math.min(config.output_volume || 0.5, 1));
      setVirtualStatus(status);
      setAiApiKey(config.ai_api_key);
      setAiApiUrl(config.ai_api_url);
      setAiProvider(aiProviders.find(provider => provider.apiUrl === config.ai_api_url)?.id || 'custom');
      setAiModel(config.ai_model);
      setFreesoundToken((config as any).freesound_token || '');
    } catch (error) {
      console.error('加载设置失败:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleOutputDeviceChange = async (deviceId: string) => {
    setSelectedOutputDevice(deviceId);
    await setOutputDevice(deviceId);
  };

  const handleVirtualDeviceChange = async (deviceId: string) => {
    setSelectedVirtualDevice(deviceId);
    await setVirtualAudioDevice(deviceId, useVirtualDevice);
  };

  const handleUseVirtualDeviceToggle = async (enabled: boolean) => {
    setUseVirtualDevice(enabled);
    await setVirtualAudioDevice(selectedVirtualDevice, enabled);
  };

  const handleOutputVolumeChange = async (vol: number) => {
    setOutputVolumeState(vol);
    await setOutputVolume(vol);
  };

  const handleSaveAIConfig = async () => {
    try {
      const config = await getConfig();
      config.ai_api_key = aiApiKey;
      config.ai_api_url = aiApiUrl.trim();
      config.ai_model = aiModel;
      (config as any).freesound_token = freesoundToken;
      await saveConfig(config);
      alert('设置已保存！');
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败: ' + error);
    }
  };

  const handleAIProviderChange = (providerId: string) => {
    const provider = aiProviders.find(item => item.id === providerId);
    setAiProvider(providerId);
    setAiTestStatus('');
    if (provider && provider.id !== 'custom') {
      setAiApiUrl(provider.apiUrl);
      setAiModel(provider.model);
    }
  };

  const handleTestAIConnection = async () => {
    setIsTestingAI(true);
    setAiTestStatus('');
    try {
      setAiTestStatus(await testAIConnection(aiApiUrl.trim(), aiApiKey.trim(), aiModel.trim()));
    } catch (error) {
      setAiTestStatus(`连接失败: ${error}`);
    } finally {
      setIsTestingAI(false);
    }
  };

  return (
    <div className="card-container p-6">
      <div className="flex items-center gap-3 mb-6">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <svg className="w-5 h-5" style={{ color: 'var(--accent-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </div>
        <h2 
          className="text-xl font-bold"
          style={{ color: 'var(--foreground)' }}
        >
          设置
        </h2>
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-sm font-medium mb-3 block" style={{ color: 'var(--muted-foreground)' }}>
            <svg className="w-4 h-4 inline mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
            音量控制
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={outputVolume}
              onChange={(e) => handleOutputVolumeChange(parseFloat(e.target.value))}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--primary) ${outputVolume * 100}%, var(--muted) ${outputVolume * 100}%)`
              }}
            />
            <span 
              className="w-14 text-right font-mono px-2 py-1 text-sm rounded-lg"
              style={{ 
                color: 'var(--foreground)',
                backgroundColor: 'var(--muted)'
              }}
            >
              {Math.round(outputVolume * 100)}%
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>统一控制你听到的音量与发送到虚拟设备的音量，避免两边听感差距过大。</p>
          <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: 'rgba(250, 204, 21, 0.1)', border: '1px solid rgba(250, 204, 21, 0.2)' }}>
            <p className="text-xs flex items-center gap-2" style={{ color: '#facc15' }}>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span>为减少爆音和音质损失，软件音量最高为 100%。队友端偏小时，请提高游戏内麦克风输入音量。</span>
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
              <svg className="w-4 h-4 inline mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
                <path d="M12 6v4m0 4v4" />
              </svg>
              音频输出设备
            </label>
            <button
              onClick={loadSettings}
              disabled={isLoading}
              className="text-xs transition-colors"
              style={{ color: 'var(--secondary)' }}
            >
              {isLoading ? '加载中...' : (
                <>
                  <svg className="w-3 h-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 21h5v-5" />
                  </svg>
                  刷新
                </>
              )}
            </button>
          </div>
          <select
            value={selectedOutputDevice}
            onChange={(e) => handleOutputDeviceChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border outline-none transition-all text-sm"
            style={{ 
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-color)',
                border: '1px solid var(--border)'
              }}
          >
            {outputDevices.map(device => (
              <option key={device.id} value={device.id} style={{ backgroundColor: 'var(--card)' }}>
                {device.name} {device.is_virtual ? '(虚拟设备)' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>选择你听到声音的设备（耳机/扬声器）</p>
        </div>

        <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(135, 206, 235, 0.1)', border: '1px solid rgba(135, 206, 235, 0.2)' }}>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
              <svg className="w-4 h-4 inline mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a9 9 0 0 0-9 9 9.75 9.75 0 0 0 6.74 9.26L12 22l2.26-1.74A9.75 9.75 0 0 0 21 11a9 9 0 0 0-9-9z" />
              </svg>
              虚拟音频设备（队友听）
            </label>
            <button
              onClick={() => handleUseVirtualDeviceToggle(!useVirtualDevice)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all`}
              style={useVirtualDevice 
                ? { backgroundColor: 'rgba(52, 168, 90, 0.15)', color: 'var(--primary)', border: '1px solid rgba(52, 168, 90, 0.3)' }
                : { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }
              }
            >
              {useVirtualDevice ? '已启用' : '已禁用'}
            </button>
          </div>

          {virtualStatus && !virtualStatus.installed && (
            <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div className="flex items-center gap-2 text-sm" style={{ color: '#ef4444' }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>未检测到虚拟音频设备</span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                请安装 <a href="https://vb-audio.com/Cable/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--secondary)' }}>VB-Audio Virtual Cable</a> 以启用此功能
              </p>
            </div>
          )}

          {virtualStatus && virtualStatus.installed && (
            <div>
              <label className="text-xs mb-2 block" style={{ color: 'var(--muted-foreground)' }}>选择虚拟输出设备</label>
              <select
                value={selectedVirtualDevice}
                onChange={(e) => handleVirtualDeviceChange(e.target.value)}
                disabled={!useVirtualDevice}
                className="w-full px-4 py-2.5 rounded-lg border outline-none transition-all text-sm"
                style={{ 
                  backgroundColor: 'var(--muted)',
                  color: 'var(--foreground)',
                  borderColor: 'var(--border)',
                  opacity: useVirtualDevice ? 1 : 0.5,
                  cursor: useVirtualDevice ? 'pointer' : 'not-allowed'
                }}
              >
                <option value="" style={{ backgroundColor: 'var(--card)' }}>请选择虚拟设备</option>
                {virtualDevices.map(device => (
                  <option key={device.id} value={device.id} style={{ backgroundColor: 'var(--card)' }}>
                    {device.name}
                  </option>
                ))}
              </select>
              <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
                <svg className="w-3 h-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                将BGM输出到虚拟设备，队友即可通过麦克风听到
              </p>
            </div>
          )}
        </div>

        <div className="pt-5" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <svg className="w-4 h-4" style={{ color: 'var(--accent-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <h3 className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>智能推荐配置</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--muted-foreground)' }}>服务商</label>
              <select
                value={aiProvider}
                onChange={(e) => handleAIProviderChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border outline-none transition-all text-sm"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
              >
                {aiProviders.map(provider => (
                  <option key={provider.id} value={provider.id} style={{ backgroundColor: 'var(--card)' }}>{provider.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--muted-foreground)' }}>API Key</label>
              <input
                type="password"
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                placeholder="sk-xxxxxxxxxxxxxxxx"
                className="w-full px-4 py-2.5 rounded-lg border outline-none transition-all text-sm"
                style={{ 
                  backgroundColor: 'var(--muted)',
                  color: 'var(--foreground)',
                  borderColor: 'var(--border)'
                }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--muted-foreground)' }}>API Base URL</label>
              <input
                type="text"
                value={aiApiUrl}
                onChange={(e) => { setAiApiUrl(e.target.value); setAiProvider('custom'); setAiTestStatus(''); }}
                placeholder="https://example.com/v1"
                className="w-full px-4 py-2.5 rounded-lg border outline-none transition-all text-sm"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>兼容 OpenAI 协议。可填写官方地址或中转站地址，末尾填写到 `/v1` 即可。</p>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--muted-foreground)' }}>模型名称</label>
              <input
                type="text"
                value={aiModel}
                onChange={(e) => { setAiModel(e.target.value); setAiTestStatus(''); }}
                placeholder="例如 deepseek-chat"
                className="w-full px-4 py-2.5 rounded-lg border outline-none transition-all text-sm"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
              />
            </div>
            <button
              onClick={handleTestAIConnection}
              disabled={isTestingAI}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
              style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
            >
              {isTestingAI ? '正在测试连接...' : '测试 AI 连接'}
            </button>
            {aiTestStatus && (
              <p className="text-xs" style={{ color: aiTestStatus.startsWith('连接成功') ? 'var(--primary)' : '#ef4444' }}>{aiTestStatus}</p>
            )}
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>API Key 仅保存在当前电脑，不会上传到你的云服务器。</p>
          </div>
        </div>

        <div className="pt-5" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              <svg className="w-4 h-4" style={{ color: 'var(--primary-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <h3 className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Freesound 音乐搜索</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--muted-foreground)' }}>API Token</label>
              <input
                type="password"
                value={freesoundToken}
                onChange={(e) => setFreesoundToken(e.target.value)}
                placeholder="从 freesound.org 获取 API Token"
                className="w-full px-4 py-2.5 rounded-lg border outline-none transition-all text-sm"
                style={{ 
                  backgroundColor: 'var(--muted)',
                  color: 'var(--foreground)',
                  borderColor: 'var(--border)'
                }}
              />
            </div>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              在 <a href="https://freesound.org/apiv2/apply/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--secondary)' }}>freesound.org/apiv2/apply/</a> 申请免费 API Token
            </p>
          </div>
        </div>

        <AnimatedLayerButton
          onClick={handleSaveAIConfig}
          className="w-full"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          保存所有设置
        </AnimatedLayerButton>
      </div>
    </div>
  );
}
