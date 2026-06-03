import { useState, useEffect } from 'react';
import { autoClipBgm, addTrack, playFilePreview, stopBgm, deleteClipFile, pickAudioFile, pickDirectory, testFfmpeg } from '../lib/tauri-api';
import type { BgmTrack } from '../types';
import { AnimatedLayerButton } from './ui/animated-layer-button';

interface AutoClipperProps {
  onClipsGenerated?: (clips: string[]) => void;
}

export function AutoClipper({ onClipsGenerated }: AutoClipperProps) {
  const [inputFile, setInputFile] = useState('');
  const [outputDir, setOutputDir] = useState('D:\\ValorantBGM');
  const [duration, setDuration] = useState(10);
  const [isClipping, setIsClipping] = useState(false);
  const [generatedClips, setGeneratedClips] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [ffmpegStatus, setFfmpegStatus] = useState('');
  const [isTestingFfmpeg, setIsTestingFfmpeg] = useState(false);
  const [playingClip, setPlayingClip] = useState<string | null>(null);
  const [addingClip, setAddingClip] = useState<string | null>(null);
  const [deletingClip, setDeletingClip] = useState<string | null>(null);
  const [defaultCategory, setDefaultCategory] = useState<'victory' | 'defeat'>('victory');

  useEffect(() => {
    checkFfmpeg();
  }, []);

  const checkFfmpeg = async () => {
    setIsTestingFfmpeg(true);
    try {
      const result = await testFfmpeg();
      setFfmpegStatus(result);
    } catch (err) {
      setFfmpegStatus(`FFmpeg 检测失败: ${err}`);
    } finally {
      setIsTestingFfmpeg(false);
    }
  };

  const selectInputFile = async () => {
    try {
      const selected = await pickAudioFile();
      if (selected) {
        setInputFile(selected);
        setStatus('');
      }
    } catch (err) {
      if (err !== '用户取消选择') {
        setStatus(`选择文件失败: ${err}`);
      }
    }
  };

  const selectOutputDir = async () => {
    try {
      const selected = await pickDirectory();
      if (selected) {
        setOutputDir(selected);
      }
    } catch (err) {
      if (err !== '用户取消选择') {
        setStatus(`选择目录失败: ${err}`);
      }
    }
  };

  const handleClip = async () => {
    if (!inputFile) {
      setStatus('请选择音频文件');
      return;
    }
    if (!outputDir) {
      setStatus('请选择输出目录');
      return;
    }

    setIsClipping(true);
    setStatus('正在分析音频能量和节奏...');
    setGeneratedClips([]);

    try {
      setStatus('检测节奏峰值，提取高潮片段...');
      const clips = await autoClipBgm(inputFile, outputDir, duration);
      setGeneratedClips(clips);
      setStatus(`成功提取 ${clips.length} 个高潮片段！`);
      if (onClipsGenerated) {
        onClipsGenerated(clips);
      }
    } catch (err) {
      setStatus(`剪辑失败: ${err}`);
    } finally {
      setIsClipping(false);
    }
  };

  const handlePreview = async (clipPath: string) => {
    if (playingClip === clipPath) {
      await stopBgm();
      setPlayingClip(null);
      return;
    }
    try {
      await playFilePreview(clipPath);
      setPlayingClip(clipPath);
    } catch (err) {
      setStatus(`预览失败: ${err}`);
    }
  };

  const handleAddClip = async (clipPath: string, category: 'victory' | 'defeat' = 'victory') => {
    setAddingClip(clipPath);
    try {
      const fileName = clipPath.split('\\').pop()?.replace(/\.[^.]+$/, '') || 'clip';
      const track: BgmTrack = {
        id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: fileName,
        path: clipPath,
        category,
        favorite: false,
        tags: ['高潮剪辑'],
      };
      await addTrack(track);
      setGeneratedClips(prev => prev.filter(c => c !== clipPath));
      const catLabel = category === 'victory' ? '胜利' : '失败';
      setStatus(`已添加到${catLabel}曲库: ${fileName}`);
    } catch (err) {
      setStatus(`添加失败: ${err}`);
    } finally {
      setAddingClip(null);
    }
  };

  const handleDeleteClip = async (clipPath: string) => {
    setDeletingClip(clipPath);
    try {
      await deleteClipFile(clipPath);
      setGeneratedClips(prev => prev.filter(c => c !== clipPath));
      if (playingClip === clipPath) {
        setPlayingClip(null);
      }
      setStatus('已删除片段');
    } catch (err) {
      setStatus(`删除失败: ${err}`);
    } finally {
      setDeletingClip(null);
    }
  };

  const handleAddAllToLibrary = async () => {
    let count = 0;
    for (const clipPath of generatedClips) {
      try {
        const fileName = clipPath.split('\\').pop()?.replace(/\.[^.]+$/, '') || 'clip';
        const track: BgmTrack = {
          id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: fileName,
          path: clipPath,
          category: defaultCategory,
          favorite: false,
          tags: ['高潮剪辑'],
        };
        await addTrack(track);
        count++;
      } catch { /* skip failed */ }
    }
    if (count > 0) {
      setGeneratedClips([]);
      const catLabel = defaultCategory === 'victory' ? '胜利' : '失败';
      setStatus(`已将 ${count} 个片段添加到${catLabel}曲库`);
    }
  };

  const getFileName = (path: string) => {
    return path.split('\\').pop() || path;
  };

  return (
    <div className="card-container p-6">
      <div className="flex items-center gap-3 mb-6">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          <svg className="w-5 h-5" style={{ color: 'var(--primary-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 19V5l12-2v13" />
            <circle cx="6" cy="19" r="3" />
            <circle cx="18" cy="16" r="3" />
            <line x1="9" y1="9" x2="15" y2="9" />
            <line x1="9" y1="13" x2="13" y2="13" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>智能高潮剪辑</h2>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>自动提取歌曲中最有节奏感的高潮片段</p>
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
              <p className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>智能算法说明</p>
              <p>分析音频能量包络和节奏节拍，自动定位最精彩的高潮副歌段落，提取节奏感最强的片段。支持试听预览后选择性添加到曲库。</p>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: ffmpegStatus.includes('成功') ? 'var(--primary)' : ffmpegStatus.includes('失败') ? '#ef4444' : 'var(--secondary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>FFmpeg 状态</span>
            </div>
            <button
              onClick={checkFfmpeg}
              disabled={isTestingFfmpeg}
              className="text-xs px-2 py-1 rounded-lg transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
            >
              {isTestingFfmpeg ? '检测中...' : '重新检测'}
            </button>
          </div>
          <p className={`text-sm mt-2 ${
            ffmpegStatus.includes('成功')
              ? 'text-[var(--primary)]'
              : ffmpegStatus.includes('失败')
                ? 'text-[#ef4444]'
                : 'text-[var(--secondary)]'
          }`}>
            {ffmpegStatus || '正在检测...'}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--muted-foreground)' }}>
            <svg className="w-4 h-4 inline mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            输入音频文件
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={inputFile}
              readOnly
              className="flex-1 px-4 py-2.5 rounded-lg border outline-none transition-all text-sm"
              style={{ 
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-color)',
                border: '1px solid var(--border)'
              }}
              placeholder="选择要剪辑的音频文件..."
            />
            <AnimatedLayerButton
              onClick={selectInputFile}
              disabled={isClipping}
              className="w-auto"
            >
              选择文件
            </AnimatedLayerButton>
          </div>
          {inputFile && (
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>已选择: {getFileName(inputFile)}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--muted-foreground)' }}>
            <svg className="w-4 h-4 inline mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            输出目录
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={outputDir}
              readOnly
              className="flex-1 px-4 py-2.5 rounded-lg border outline-none transition-all text-sm"
              style={{ 
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-color)',
                border: '1px solid var(--border)'
              }}
              placeholder="保存剪辑片段的位置..."
            />
            <AnimatedLayerButton
              onClick={selectOutputDir}
              disabled={isClipping}
              className="w-auto"
            >
              选择目录
            </AnimatedLayerButton>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
              <svg className="w-4 h-4 inline mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              片段时长
            </label>
            <span 
              className="font-mono rounded-lg px-3 py-1 text-sm"
              style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}
            >{duration} 秒</span>
          </div>
          <input
            type="range"
            min={5}
            max={30}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={isClipping}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{ backgroundColor: 'var(--muted)', accentColor: '#f59e0b' }}
          />
          <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
            <span>5秒</span>
            <span>15秒</span>
            <span>30秒</span>
          </div>
        </div>

        <AnimatedLayerButton
          onClick={handleClip}
          disabled={isClipping || !inputFile || !outputDir}
          className="w-full"
        >
          {isClipping ? status : '智能提取高潮片段'}
        </AnimatedLayerButton>

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

        {generatedClips.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
                <svg className="w-4 h-4 inline mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                生成的片段 ({generatedClips.length})
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={defaultCategory}
                  onChange={(e) => setDefaultCategory(e.target.value as 'victory' | 'defeat')}
                  className="px-2 py-1.5 rounded-lg border text-xs outline-none"
                  style={{ 
                    backgroundColor: 'var(--muted)',
                    color: 'var(--foreground)',
                    borderColor: 'var(--border)'
                  }}
                >
                  <option value="victory">胜利</option>
                  <option value="defeat">失败</option>
                </select>
                <button
                  onClick={handleAddAllToLibrary}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ backgroundColor: 'rgba(52, 168, 90, 0.15)', color: 'var(--primary)' }}
                >
                  <svg className="w-4 h-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 16V4m0 0L3 8m4-4l4 4" />
                    <path d="M17 16V4m0 0l4 4m-4-4l-4 4" />
                  </svg>
                  全部添加
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {generatedClips.map((clip, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-3 p-3 rounded-lg border hover:transition-all group"
                  style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}
                >
                  <button
                    onClick={() => handlePreview(clip)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                      playingClip === clip
                        ? 'bg-[#f59e0b] text-white'
                        : 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                    }`}
                  >
                    {playingClip === clip ? (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                      {getFileName(clip)}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      片段 {idx + 1} · {duration}秒
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddClip(clip, 'victory')}
                    disabled={addingClip === clip}
                    className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    style={{ backgroundColor: 'rgba(52, 168, 90, 0.15)', color: 'var(--primary)' }}
                    title="添加到胜利曲库"
                  >
                    {addingClip === clip ? '...' : '胜利'}
                  </button>
                  <button
                    onClick={() => handleAddClip(clip, 'defeat')}
                    disabled={addingClip === clip}
                    className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
                    title="添加到失败曲库"
                  >
                    {addingClip === clip ? '...' : '失败'}
                  </button>

                  <button
                    onClick={() => handleDeleteClip(clip)}
                    disabled={deletingClip === clip}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
                    title="删除此片段"
                  >
                    <svg className="w-3 h-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                    删除
                  </button>
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
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>节奏检测</div>
            </div>
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--muted)' }}
            >
              <div className="mb-1">
                <svg className="w-5 h-5 mx-auto" style={{ color: 'var(--muted-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>能量分析</div>
            </div>
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--muted)' }}
            >
              <div className="mb-1">
                <svg className="w-5 h-5 mx-auto" style={{ color: 'var(--muted-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>多段提取</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
