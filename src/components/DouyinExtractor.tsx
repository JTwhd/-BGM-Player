import { useState, useEffect, useRef } from 'react';
import { extractDouyinAudio, isBackendReady, restartBackend, getBgmStoragePath, pickDirectory, setBgmStoragePath } from '../lib/tauri-api';
import type { BackendStatus } from '../lib/tauri-api';

interface ExtractedItem {
  title: string;
  audioPath: string;
  added: boolean;
}

export function DouyinExtractor() {
  const [url, setUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [status, setStatus] = useState('');
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [savePath, setSavePath] = useState('');
  const [backendReady, setBackendReady] = useState(false);
  const [backendError, setBackendError] = useState('');
  const [isCheckingBackend, setIsCheckingBackend] = useState(true);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isSelectingPath, setIsSelectingPath] = useState(false);
  const pathInitialized = useRef(false);

  const checkBackendStatus = async () => {
    setIsCheckingBackend(true);
    try {
      const [result, storagePath] = await Promise.all([
        isBackendReady(),
        getBgmStoragePath()
      ]);
      setBackendReady(result.ready);
      setBackendError(result.error || '');
      if (!pathInitialized.current) {
        setSavePath(storagePath);
        pathInitialized.current = true;
      }
    } catch (error) {
      console.error('检查后端状态失败:', error);
      setBackendReady(false);
      setBackendError('无法连接到后端服务');
    }
    setIsCheckingBackend(false);
  };

  const handleSelectSavePath = async () => {
    setIsSelectingPath(true);
    setStatus('正在打开目录选择器...');
    try {
      const selected = await pickDirectory();
      if (selected) {
        await setBgmStoragePath(selected);
        setSavePath(selected);
        pathInitialized.current = true;
        setStatus(`已保存本地音频目录: ${selected}`);
      } else {
        setStatus('');
      }
    } catch (err) {
      const errMsg = String(err);
      if (errMsg.includes('用户取消选择') || errMsg.includes('cancel')) {
        setStatus('');
      } else {
        console.error('选择目录失败:', err);
        setStatus(`选择目录失败: ${errMsg}`);
      }
    }
    setIsSelectingPath(false);
  };

  useEffect(() => {
    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRestartBackend = async () => {
    setIsRestarting(true);
    setBackendError('');
    try {
      await restartBackend();
      setStatus('正在重启后端服务...');
      let attempts = 0;
      while (attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const result: BackendStatus = await isBackendReady();
        if (result.ready) {
          setBackendReady(true);
          setStatus('后端服务已重启');
          break;
        }
        attempts++;
      }
      if (attempts >= 30) {
        setBackendError('后端重启超时，请检查网络连接');
      }
    } catch (error) {
      setBackendError('重启后端失败: ' + error);
    }
    setIsRestarting(false);
  };

  const handleExtract = async () => {
    if (!url.trim()) {
      setStatus('请输入抖音视频链接');
      return;
    }

    const isDouyinUrl = url.includes('douyin.com') || url.includes('v.douyin.com');
    if (!isDouyinUrl) {
      setStatus('请输入有效的抖音视频链接');
      return;
    }

    if (!savePath) {
      setStatus('请选择保存目录');
      return;
    }

    setIsExtracting(true);
    setStatus('正在解析视频...');

    try {
      const result = await extractDouyinAudio(url.trim(), savePath);

      if (result.success && result.title && result.audio_path) {
        setStatus(`音频提取成功！已保存到 ${savePath}`);
        setExtractedItems(prev => [{
          title: result.title as string,
          audioPath: result.audio_path as string,
          added: true
        }, ...prev]);
        setUrl('');
      } else {
        setStatus(`${result.error || '提取失败'}`);
      }
    } catch (error) {
      setStatus(`提取失败: ${error}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleOpenFileLocation = (path: string) => {
    const folder = path.substring(0, path.lastIndexOf('\\'));
    window.open(`file:///${folder.replace(/\\/g, '/')}`);
  };

  return (
    <div className="card-container p-6">
      <div className="flex items-center gap-3 mb-6">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          <svg className="w-5 h-5" style={{ color: 'var(--primary-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>音频提取</h2>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>提取视频中的音频</p>
        </div>
      </div>

      <div className="space-y-4">
        <div 
          className="rounded-lg p-4"
          style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-start gap-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <svg className="w-4 h-4" style={{ color: 'var(--accent-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              <p className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>使用说明</p>
              <p>打开抖音APP，分享视频时点击"复制链接"，粘贴到下方输入框即可提取音频。</p>
              <p className="mt-2" style={{ color: 'var(--primary)' }}>选择保存目录后直接提取，自己分类管理</p>
              <p style={{ color: '#facc15' }}>请确保已安装 FFmpeg 并添加到系统环境变量 PATH 中。</p>
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--muted-foreground)' }}>
            <svg className="w-4 h-4 inline mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            抖音视频链接
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-lg border outline-none transition-all text-sm"
              style={{ 
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-color)',
                border: '1px solid var(--border)'
              }}
              placeholder="粘贴抖音视频链接 (例如: https://v.douyin.com/...)"
              disabled={isExtracting}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--muted-foreground)' }}>
            <svg className="w-4 h-4 inline mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            保存目录
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={savePath}
              readOnly
              className="flex-1 px-4 py-2.5 rounded-lg border text-sm truncate"
              style={{ 
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-color)',
                border: '1px solid var(--border)'
              }}
              placeholder="请选择保存目录"
            />
            <button
              onClick={handleSelectSavePath}
              disabled={isExtracting || isSelectingPath}
              className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)' }}
            >
              {isSelectingPath ? '选择中...' : '选择目录'}
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>点击选择目录按钮选择音频保存位置</p>
        </div>

        {isCheckingBackend && (
          <div 
            className="p-4 rounded-lg flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border)' }}
          >
            <div className="w-4 h-4 border-2 border-[var(--secondary)]/30 border-t-[var(--secondary)] rounded-full animate-spin"></div>
            <span className="text-sm" style={{ color: 'var(--secondary)' }}>解析服务启动中...</span>
          </div>
        )}

        {!backendReady && !isCheckingBackend && (
          <div 
            className="p-4 rounded-lg border"
            style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm flex items-center gap-2" style={{ color: '#ef4444' }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                解析服务未就绪
              </span>
              <button
                onClick={handleRestartBackend}
                disabled={isRestarting}
                className="text-xs px-3 py-1 rounded transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#ef4444', color: 'white' }}
              >
                {isRestarting ? '重启中...' : '重试'}
              </button>
            </div>
            {backendError && (
              <p className="text-xs" style={{ color: '#ef4444' }}>{backendError}</p>
            )}
          </div>
        )}

        <button
          onClick={handleExtract}
          disabled={isExtracting || !url.trim() || !savePath || !backendReady || isCheckingBackend}
          className="w-full py-3 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          style={{ backgroundColor: '#ef4444', color: 'white' }}
        >
          {isExtracting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              {status}
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0 3-4.03 3-9s-1.343-9-3-9m-9 9a9 9 0 0 1 9-9" />
              </svg>
              提取音频
            </>
          )}
        </button>

        {status && (
          <div className={`p-4 rounded-lg text-sm border ${
            status.includes('成功')
              ? 'bg-[rgba(52,168,90,0.1)] text-[var(--primary)] border-[rgba(52,168,90,0.2)]'
              : status.includes('失败')
              ? 'bg-[rgba(239,68,68,0.1)] text-[#ef4444] border-[rgba(239,68,68,0.2)]'
              : 'bg-[rgba(135,206,235,0.1)] text-[var(--secondary)] border-[rgba(135,206,235,0.2)]'
          }`}>
            {status}
          </div>
        )}

        {extractedItems.length > 0 && (
          <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--foreground)' }}>已提取的音频</h3>
            <div className="space-y-2">
              {extractedItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--muted)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: 'var(--foreground)' }}>{item.title}</p>
                    <p className="text-xs mt-1 truncate" style={{ color: 'var(--muted-foreground)' }}>{item.audioPath}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenFileLocation(item.audioPath)}
                      className="text-xs px-3 py-1.5 rounded transition-colors"
                      style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)' }}
                      title="打开文件夹位置"
                    >
                      <svg className="w-3 h-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 21h5v-2a3 3 0 0 0-5.356-1.857M15 21H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                      </svg>
                      打开位置
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--muted)' }}
            >
              <div className="mb-1">
                <svg className="w-5 h-5 mx-auto" style={{ color: 'var(--muted-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>支持分享链接</div>
            </div>
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--muted)' }}
            >
              <div className="mb-1">
                <svg className="w-5 h-5 mx-auto" style={{ color: 'var(--muted-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="9" y1="9" x2="15" y2="9" />
                  <line x1="9" y1="15" x2="14" y2="15" />
                </svg>
              </div>
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>API解析</div>
            </div>
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--muted)' }}
            >
              <div className="mb-1">
                <svg className="w-5 h-5 mx-auto" style={{ color: 'var(--muted-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>MP3格式</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-center pt-4" style={{ color: 'var(--muted-foreground)', borderTop: '1px solid var(--border)' }}>
          <p>请尊重原作者版权，提取的音频仅供个人学习使用。</p>
          <p>© 2024 BGM Player - 使用本地 API 提供解析服务</p>
        </div>
      </div>
    </div>
  );
}
