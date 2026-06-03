
import { useState, useEffect } from 'react';
import { Speaker, X, Info, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { checkVirtualAudioDriver, installVirtualAudioDriver } from '../lib/tauri-api';

export default function VirtualAudioGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installStatus, setInstallStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [installMessage, setInstallMessage] = useState('');

  useEffect(() => {
    const dismissed = localStorage.getItem('virtualAudioGuideDismissed');
    if (!dismissed) {
      checkDriverInstalled();
    }
  }, []);

  const checkDriverInstalled = async () => {
    try {
      const response = await checkVirtualAudioDriver();
      if (!response) {
        setIsOpen(true);
      }
    } catch {
      setIsOpen(true);
    }
  };

  const handleInstallDriver = async () => {
    setIsInstalling(true);
    setInstallStatus('idle');

    try {
      const result = await installVirtualAudioDriver();
      setInstallStatus('success');
      setInstallMessage(result);
    } catch (error) {
      setInstallStatus('error');
      setInstallMessage(String(error));
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem('virtualAudioGuideDismissed', 'true');
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#141A24] rounded-xl border border-[#2A3444] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#2A3444] bg-gradient-to-r from-[#00B1EA]/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00B1EA]/20 flex items-center justify-center">
              <Speaker className="w-5 h-5 text-[#00B1EA]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">设置虚拟音频设备</h3>
              <p className="text-xs text-gray-400">让队友也能听到你的BGM</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-[#2A3444]/50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-[#00B1EA]/20 flex items-center justify-center flex-shrink-0">
                <Info className="w-4 h-4 text-[#00B1EA]" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white mb-2">自动安装虚拟音频驱动</h4>
                {installStatus === 'idle' && (
                  <button
                    onClick={handleInstallDriver}
                    disabled={isInstalling}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#00B1EA] text-white rounded-lg hover:bg-[#0090C8] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isInstalling ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        安装中...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        一键安装 VB-CABLE 虚拟音频驱动
                      </>
                    )}
                  </button>
                )}
                {installStatus === 'success' && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 rounded-lg text-green-400 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    {installMessage}
                  </div>
                )}
                {installStatus === 'error' && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 rounded-lg text-red-400 text-sm">
                    安装失败: {installMessage}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  驱动由 VB-Audio 提供，安装后会创建虚拟音频设备
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-[#2A3444]/50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-[#F4D060]/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-[#F4D060]" />
              </div>
              <div>
                <h4 className="font-medium text-white mb-1">第二步：选择虚拟设备</h4>
                <p className="text-sm text-gray-300">
                  在程序设置里，把"输出到虚拟设备"设置为 VB-CABLE
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-[#2A3444]/50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium text-white mb-1">第三步：设置游戏麦克风</h4>
                <p className="text-sm text-gray-300">
                  打开游戏设置，把麦克风设置为 VB-CABLE，队友就能听到你的BGM了！
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-2.5 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-colors"
            >
              以后再说
            </button>
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 bg-[#00B1EA] text-white rounded-lg hover:bg-[#0090C8] transition-colors font-medium"
            >
              知道了
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
