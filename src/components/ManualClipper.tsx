import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { manualClipAudio, getAudioDuration, pickAudioFile, pickDirectory, addTrack, getBgmStoragePath, getPlaybackPosition, playFilePreviewFrom, stopBgm } from '../lib/tauri-api';
import type { BgmTrack } from '../types';
import { AnimatedLayerButton } from './ui/animated-layer-button';

interface ClipRangeTrackProps {
  duration: number;
  startTime: number;
  endTime: number;
  disabled: boolean;
  onChange: (startTime: number, endTime: number) => void;
}

function ClipRangeTrack({ duration, startTime, endTime, disabled, onChange }: ClipRangeTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const activeHandleRef = useRef<'start' | 'end' | null>(null);
  const maximum = Math.max(duration, 1);
  const startPercent = (startTime / maximum) * 100;
  const endPercent = (endTime / maximum) * 100;

  const getPointerTime = (clientX: number) => {
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0) return 0;
    return Math.max(0, Math.min(duration, ((clientX - bounds.left) / bounds.width) * duration));
  };

  const updateHandle = (clientX: number, handle = activeHandleRef.current) => {
    if (!handle || disabled || duration <= 0) return;
    const nextTime = getPointerTime(clientX);
    const minimumGap = Math.min(0.1, duration);
    if (handle === 'start') {
      onChange(Math.max(0, Math.min(nextTime, endTime - minimumGap)), endTime);
    } else {
      onChange(startTime, Math.min(duration, Math.max(nextTime, startTime + minimumGap)));
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return;
    const nextTime = getPointerTime(event.clientX);
    activeHandleRef.current =
      Math.abs(nextTime - startTime) <= Math.abs(nextTime - endTime) ? 'start' : 'end';
    event.currentTarget.setPointerCapture(event.pointerId);
    updateHandle(event.clientX);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activeHandleRef.current) updateHandle(event.clientX);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    updateHandle(event.clientX);
    activeHandleRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      ref={trackRef}
      className={`relative h-8 touch-none select-none ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="absolute left-0 right-0 top-3 h-1 rounded-full" style={{ backgroundColor: 'var(--input-bg)' }} />
      <div
        className="absolute top-3 h-1 rounded-full"
        style={{
          left: `${startPercent}%`,
          right: `${100 - endPercent}%`,
          backgroundColor: 'var(--primary)',
        }}
      />
      {[
        ['start', startPercent],
        ['end', endPercent],
      ].map(([handle, percent]) => (
        <div
          key={handle}
          className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
          style={{ left: `${percent}%`, backgroundColor: 'var(--primary)' }}
        />
      ))}
    </div>
  );
}

interface PlaybackTrackProps {
  duration: number;
  value: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
}

function PlaybackTrack({ duration, value, onChange, onCommit }: PlaybackTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const getPointerTime = (clientX: number) => {
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0) return 0;
    return Math.max(0, Math.min(duration, ((clientX - bounds.left) / bounds.width) * duration));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    onChange(getPointerTime(event.clientX));
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) onChange(getPointerTime(event.clientX));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const nextTime = getPointerTime(event.clientX);
    onChange(nextTime);
    onCommit(nextTime);
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const percent = duration > 0 ? (value / duration) * 100 : 0;

  return (
    <div
      ref={trackRef}
      className="relative h-8 cursor-pointer touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="absolute left-0 right-0 top-3 h-1 rounded-full" style={{ backgroundColor: 'var(--input-bg)' }} />
      <div className="absolute left-0 top-3 h-1 rounded-full" style={{ width: `${percent}%`, backgroundColor: 'var(--primary)' }} />
      <div
        className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
        style={{ left: `${percent}%`, backgroundColor: 'var(--primary)' }}
      />
    </div>
  );
}

export function ManualClipper() {
  const [inputFile, setInputFile] = useState('');
  const [outputDir, setOutputDir] = useState('D:\\ValorantBGM');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(10);
  const [duration, setDuration] = useState(0);
  const [isClipping, setIsClipping] = useState(false);
  const [isGettingDuration, setIsGettingDuration] = useState(false);
  const [status, setStatus] = useState('');
  const [outputFile, setOutputFile] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [defaultCategory, setDefaultCategory] = useState<'victory' | 'defeat'>('victory');

  useEffect(() => {
    getBgmStoragePath().then(setOutputDir).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(async () => {
      try {
        const nextTime = Math.min(await getPlaybackPosition(), duration);
        setPreviewTime(nextTime);
        if (nextTime >= duration) setIsPlaying(false);
      } catch {
        setIsPlaying(false);
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [isPlaying, duration]);

  const selectInputFile = async () => {
    try {
      const selected = await pickAudioFile();
      if (selected) {
        setInputFile(selected);
        setStatus('');
        await loadAudioDuration(selected);
      }
    } catch (err) {
      if (err !== '用户取消选择') {
        setStatus(`选择文件失败: ${err}`);
      }
    }
  };

  const loadAudioDuration = async (path: string) => {
    setIsGettingDuration(true);
    try {
      const dur = await getAudioDuration(path);
      setDuration(dur);
      setStartTime(0);
      setEndTime(Math.min(10, dur));
      setPreviewTime(0);
      setStatus(`音频时长: ${dur.toFixed(1)} 秒`);
    } catch (err) {
      setStatus(`获取时长失败: ${err}`);
    } finally {
      setIsGettingDuration(false);
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleClip = async () => {
    if (!inputFile) {
      setStatus('请选择音频文件');
      return;
    }
    if (startTime >= endTime) {
      setStatus('结束时间必须大于开始时间');
      return;
    }
    if (endTime > duration) {
      setStatus('结束时间不能超过音频总时长');
      return;
    }

    setIsClipping(true);
    setStatus('正在剪辑...');
    setOutputFile('');

    try {
      const inputName = inputFile.split('\\').pop()?.replace(/\.[^.]+$/, '') || 'clip';
      const outputPath = `${outputDir}\\${inputName}_manual_${Date.now()}.mp3`;
      
      await manualClipAudio(inputFile, outputPath, startTime, endTime);
      setOutputFile(outputPath);
      setStatus(`剪辑成功！保存到: ${outputPath}`);
    } catch (err) {
      setStatus(`剪辑失败: ${err}`);
    } finally {
      setIsClipping(false);
    }
  };

  const handlePreview = async () => {
    if (!inputFile) return;

    try {
      if (isPlaying) {
        await stopBgm();
        setIsPlaying(false);
      } else {
        await playFilePreviewFrom(inputFile, previewTime >= duration ? 0 : previewTime);
        if (previewTime >= duration) setPreviewTime(0);
        setIsPlaying(true);
      }
    } catch (err) {
      setStatus(`预览失败: ${err}`);
    }
  };

  const handlePreviewSeek = async (nextTime: number) => {
    const safeTime = Math.max(0, Math.min(duration, nextTime));
    setPreviewTime(safeTime);
    if (isPlaying) {
      try {
        await playFilePreviewFrom(inputFile, safeTime);
      } catch (err) {
        setStatus(`预览失败: ${err}`);
        setIsPlaying(false);
      }
    }
  };

  const handleAddToLibrary = async () => {
    if (!outputFile) {
      setStatus('请先剪辑音频');
      return;
    }

    try {
      const fileName = outputFile.split('\\').pop()?.replace(/\.[^.]+$/, '') || 'clip';
      const track: BgmTrack = {
        id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: fileName,
        path: outputFile,
        category: defaultCategory,
        favorite: false,
        tags: ['手动剪辑'],
      };
      await addTrack(track);
      const catLabel = defaultCategory === 'victory' ? '胜利' : '失败';
      setStatus(`已添加到${catLabel}曲库: ${fileName}`);
    } catch (err) {
      setStatus(`添加失败: ${err}`);
    }
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
            <line x1="9" y1="7" x2="15" y2="7" />
            <line x1="9" y1="11" x2="15" y2="11" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>手动音频剪辑</h2>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>精确选择开始和结束时间，自定义剪辑音频</p>
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
              <p>选择音频文件后，可以预览并精确设置剪辑的开始和结束时间。时间格式：分:秒.毫秒（例如: 1:30.50）</p>
            </div>
          </div>
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
                border: '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.08)'
              }}
              placeholder="选择要剪辑的音频文件..."
            />
            <AnimatedLayerButton
              onClick={selectInputFile}
              disabled={isClipping || isGettingDuration}
              className="w-auto"
            >
              {isGettingDuration ? '加载中...' : '选择文件'}
            </AnimatedLayerButton>
          </div>
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

        {duration > 0 && (
          <div 
            className="rounded-lg p-3 border"
            style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>音频总时长</span>
              <span className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {inputFile && (
          <div className="space-y-4">
            <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>剪辑区间</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>拖动左右两个滑块，选择需要保留的音频片段</p>
                </div>
                <span className="font-mono text-sm font-bold" style={{ color: '#f97316' }}>{(endTime - startTime).toFixed(1)} 秒</span>
              </div>

              <ClipRangeTrack
                duration={duration}
                startTime={startTime}
                endTime={endTime}
                disabled={isClipping || !duration}
                onChange={(nextStartTime, nextEndTime) => {
                  setStartTime(nextStartTime);
                  setEndTime(nextEndTime);
                }}
              />

              <div className="flex justify-between mt-2 font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>
                <span>{formatTime(startTime)}</span>
                <span>{formatTime(endTime)}</span>
              </div>
            </div>

            <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">播放进度</p>
                <span className="font-mono text-xs">{formatTime(previewTime)} / {formatTime(duration)}</span>
              </div>
              <PlaybackTrack
                duration={duration}
                value={previewTime}
                onChange={setPreviewTime}
                onCommit={handlePreviewSeek}
              />
              <button onClick={handlePreview} className="mt-3 w-full px-3 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>{isPlaying ? '暂停预览' : '播放预览'}</button>
            </div>
          </div>
        )}

        <AnimatedLayerButton
          onClick={handleClip}
          disabled={isClipping || !inputFile || !duration}
          className="w-full"
        >
          {isClipping ? status : '开始剪辑'}
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

        {outputFile && (
          <div 
            className="rounded-lg p-4 border"
            style={{ backgroundColor: 'rgba(52, 168, 90, 0.1)', borderColor: 'rgba(52, 168, 90, 0.2)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                  {outputFile.split('\\').pop()}
                </p>
                <p className="text-xs" style={{ color: 'var(--primary)' }}>
                  剪辑时长: {(endTime - startTime).toFixed(1)} 秒
                </p>
              </div>
              <select
                value={defaultCategory}
                onChange={(e) => setDefaultCategory(e.target.value as 'victory' | 'defeat')}
                className="px-3 py-2 rounded-lg border text-sm outline-none ml-3"
                style={{ 
                  backgroundColor: 'var(--muted)',
                  color: 'var(--foreground)',
                  borderColor: 'var(--border)'
                }}
              >
                <option value="victory">胜利</option>
                <option value="defeat">失败</option>
              </select>
            </div>
            <AnimatedLayerButton
              onClick={handleAddToLibrary}
              className="w-full"
            >
              添加到曲库
            </AnimatedLayerButton>
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
                  <path d="M11 20l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </div>
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>精确时间</div>
            </div>
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--muted)' }}
            >
              <div className="mb-1">
                <svg className="w-5 h-5 mx-auto" style={{ color: 'var(--muted-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>预览试听</div>
            </div>
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--muted)' }}
            >
              <div className="mb-1">
                <svg className="w-5 h-5 mx-auto" style={{ color: 'var(--muted-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 10H2" />
                  <path d="M17 14H2" />
                  <path d="M12 20H2" />
                  <path d="M21.73 7.5a2.4 2.4 0 0 0-1.73-1.73L13 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V11a2.4 2.4 0 0 0-.27-1.5z" />
                </svg>
              </div>
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>自定义剪辑</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
