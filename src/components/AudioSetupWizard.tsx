import { useState, useEffect } from 'react';
import { getOutputDevices, checkVirtualAudioDevice, setVirtualAudioDevice, playBgm } from '../lib/tauri-api';
import type { AudioDevice } from '../types';
import type { VirtualAudioStatus } from '../lib/tauri-api';

interface AudioSetupWizardProps {
  onComplete: () => void;
}

type Step = 1 | 2 | 3;

export function AudioSetupWizard({ onComplete }: AudioSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [virtualStatus, setVirtualStatus] = useState<VirtualAudioStatus | null>(null);
  const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([]);
  const [selectedVirtualDevice, setSelectedVirtualDevice] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [status, devices] = await Promise.all([
        checkVirtualAudioDevice(),
        getOutputDevices(),
      ]);
      setVirtualStatus(status);
      setOutputDevices(devices);
      if (status.output_device) {
        setSelectedVirtualDevice(status.output_device.id);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
    setIsLoading(false);
  };

  const handleStep1Next = () => {
    if (virtualStatus?.installed) {
      setCurrentStep(2);
    }
  };

  const handleStep2Next = () => {
    setCurrentStep(3);
  };

  const handleTestAudio = async () => {
    setIsTesting(true);
    try {
      await playBgm('victory');
      setTestSuccess(true);
    } catch (error) {
      console.error('测试失败:', error);
      setTestSuccess(false);
    }
    setIsTesting(false);
  };

  const handleComplete = async () => {
    if (selectedVirtualDevice && virtualStatus?.installed) {
      await setVirtualAudioDevice(selectedVirtualDevice, true);
    }
    onComplete();
  };

  if (isLoading) {
    return (
      <div className="card-gradient p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-4xl mb-4">🔄</div>
        <p className="text-white">加载中...</p>
      </div>
    );
  }

  const steps = [
    { number: 1, title: '安装虚拟音频设备', description: '检测并安装VB-Cable' },
    { number: 2, title: '配置游戏语音', description: '设置无畏契约输入设备' },
    { number: 3, title: '配置软件输出', description: '设置BGM输出到虚拟设备' },
  ];

  return (
    <div className="card-gradient p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-xl">
          🎵
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">音频设置向导</h2>
          <p className="text-[#8d96ad] text-sm">按照指引完成设置，让队友听到你的BGM</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                currentStep >= step.number
                  ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white'
                  : 'bg-white/10 text-white/50'
              }`}
            >
              {currentStep > step.number ? '✓' : step.number}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-16 h-1 mx-2 rounded-full transition-all ${
                  currentStep > step.number ? 'bg-gradient-to-r from-purple-500 to-pink-600' : 'bg-white/10'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="min-h-[300px]">
        {/* 步骤1：检测VB-Cable */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                virtualStatus?.installed ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {virtualStatus?.installed ? '✅' : '🔍'}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">检测虚拟音频设备</h3>
                <p className="text-[#8d96ad]">
                  {virtualStatus?.installed
                    ? '✓ VB-Cable 虚拟音频设备已安装，继续下一步配置。'
                    : '需要安装 VB-Audio Virtual Cable 才能让队友听到你的BGM。'}
                </p>
              </div>
            </div>

            {!virtualStatus?.installed && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-red-400">
                  <span className="text-xl">⚠️</span>
                  <span className="font-medium">需要安装虚拟音频设备</span>
                </div>
                <p className="text-[#c4cce0] text-sm">
                  VB-Audio Virtual Cable 是一个免费的虚拟音频驱动，它可以将你的音乐输出路由到麦克风输入。
                </p>
                <div className="space-y-2">
                  <a
                    href="https://vb-audio.com/Cable/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl text-center font-medium transition-all"
                  >
                    📥 下载 VB-Audio Virtual Cable
                  </a>
                  <p className="text-[#6b7280] text-xs text-center">
                    下载后安装，然后点击下方按钮重新检测
                  </p>
                </div>
                <button
                  onClick={loadData}
                  className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                >
                  🔄 重新检测设备
                </button>
              </div>
            )}

            {virtualStatus?.installed && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <span className="text-xl">✅</span>
                  <span className="font-medium">虚拟音频设备检测成功</span>
                </div>
                <p className="text-[#c4cce0] text-sm">
                  已检测到: {virtualStatus.output_device?.name}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 步骤2：游戏语音配置 */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                🎮
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">配置游戏语音输入</h3>
                <p className="text-[#8d96ad]">
                  请在《无畏契约》中设置麦克风输入为虚拟设备。
                </p>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-lg">1️⃣</span>
                <p className="text-[#c4cce0]">打开《无畏契约》，进入设置 → 音频设置</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">2️⃣</span>
                <p className="text-[#c4cce0]">找到"输入设备"选项，选择 <strong className="text-white">CABLE Output</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">3️⃣</span>
                <p className="text-[#c4cce0]">确保语音聊天已开启（建议使用按键发言模式）</p>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <span className="text-xl">💡</span>
                <span className="font-medium">提示</span>
              </div>
              <p className="text-[#c4cce0] text-sm">
                设置完成后，游戏会从 CABLE Output 接收音频输入，这正是我们需要的效果。
              </p>
            </div>
          </div>
        )}

        {/* 步骤3：软件输出配置 */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
                🎧
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">配置BGM输出设备</h3>
                <p className="text-[#8d96ad]">
                  选择虚拟音频设备作为BGM输出目标。
                </p>
              </div>
            </div>

            <div>
              <label className="text-[#c4cce0] mb-3 block text-sm font-medium">选择虚拟输出设备</label>
              <select
                value={selectedVirtualDevice}
                onChange={(e) => setSelectedVirtualDevice(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 text-white rounded-xl border border-white/10 focus:border-purple-500/50 outline-none transition-all"
              >
                <option value="">请选择虚拟音频设备</option>
                {outputDevices.filter(d => d.is_virtual).map(device => (
                  <option key={device.id} value={device.id} className="bg-[#0b0f19]">
                    {device.name}
                  </option>
                ))}
                {outputDevices.filter(d => !d.is_virtual).map(device => (
                  <option key={device.id} value={device.id} className="bg-[#0b0f19]">
                    {device.name} (非虚拟)
                  </option>
                ))}
              </select>
            </div>

            {testSuccess !== null && (
              <div className={`rounded-xl p-4 ${
                testSuccess ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{testSuccess ? '✅' : '❌'}</span>
                  <span className={testSuccess ? 'text-green-400' : 'text-red-400'}>
                    {testSuccess ? '测试成功！BGM已播放。' : '测试失败，请检查设备设置。'}
                  </span>
                </div>
              </div>
            )}

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <span className="text-xl">🎯</span>
                <span className="font-medium">测试设置</span>
              </div>
              <p className="text-[#c4cce0] text-sm mb-3">
                点击下方按钮测试BGM播放是否正常。如果设置正确，队友应该能听到你的BGM。
              </p>
              <button
                onClick={handleTestAudio}
                disabled={isTesting || !selectedVirtualDevice}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-500 disabled:to-gray-600 text-white rounded-xl font-medium transition-all"
              >
                {isTesting ? '🔊 测试中...' : '🎵 测试播放'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
        <button
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1) as Step)}
          disabled={currentStep === 1}
          className="px-6 py-2.5 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 text-white rounded-xl transition-all"
        >
          ← 上一步
        </button>

        {currentStep < 3 ? (
          <button
            onClick={currentStep === 1 ? handleStep1Next : handleStep2Next}
            disabled={currentStep === 1 && !virtualStatus?.installed}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-500 disabled:to-gray-600 text-white rounded-xl font-medium transition-all"
          >
            下一步 →
          </button>
        ) : (
          <button
            onClick={handleComplete}
            disabled={!selectedVirtualDevice}
            className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-500 disabled:to-gray-600 text-white rounded-xl font-medium transition-all"
          >
            ✅ 完成设置
          </button>
        )}
      </div>
    </div>
  );
}