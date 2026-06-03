import type { BgmTrack } from '../types';
import { useState } from 'react';

interface PlayerBarProps {
  isPlaying: boolean;
  volume: number;
  track: BgmTrack | null;
  lastHotkey: string | null;
  onPause: () => void;
  onResume: () => void;
  onPlay: (category: string) => void;
  onVolumeChange: (volume: number) => void;
}

export function PlayerBar({ isPlaying, volume, track, lastHotkey, onPause, onResume, onPlay, onVolumeChange }: PlayerBarProps) {
  const [prevVolume, setPrevVolume] = useState(0.7);
  const [showSkipToast, setShowSkipToast] = useState(false);
  return (
    <div 
      className="h-[80px] flex items-center px-4 gap-4"
      style={{ backgroundColor: 'var(--card)', borderTop: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3 min-w-[200px] flex-shrink-0">
        <div className={`relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 ${
          track 
            ? track.category === 'defeat'
              ? 'bg-gradient-to-br from-[#ef4444] to-[#991b1b]'
              : 'bg-[var(--primary)]'
            : 'bg-[var(--muted)]'
        }`}>
          {track ? (
            <>
              <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                {track.name.charAt(0)}
              </span>
              {isPlaying && (
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-black/50 flex items-end justify-center gap-0.5 px-1.5 pb-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div 
                      key={i}
                      className="w-1 bg-white/80 rounded-full animate-pulse"
                      style={{ 
                        height: `${20 + Math.random() * 60}%`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '0.5s'
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <svg className="absolute inset-0 m-auto w-5 h-5" style={{ color: 'var(--muted-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--card-foreground)' }}>
            {track ? track.name : '未播放'}
          </span>
          <span className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
            {track ? (track.category === 'victory' ? '胜利 BGM' : '失败 BGM') : '等待播放'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-1 justify-center">
        <button
          onClick={() => {
            if (track) {
              onPlay(track.category);
              setShowSkipToast(true);
              setTimeout(() => setShowSkipToast(false), 1500);
            }
          }}
          className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
          style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}
          title="随机切换同类型BGM"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </button>
        <button
          onClick={() => {
            if (isPlaying) {
              onPause();
            } else if (track) {
              onResume();
            }
          }}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:scale-105 ${
            isPlaying
              ? 'bg-white text-black'
              : 'bg-[var(--primary)] text-[var(--primary-foreground)]'
          }`}
        >
          {isPlaying ? (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>
        <button
          onClick={() => {
            if (track) {
              onPlay(track.category);
              setShowSkipToast(true);
              setTimeout(() => setShowSkipToast(false), 1500);
            }
          }}
          className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
          style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}
          title="随机切换同类型BGM"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-3 min-w-[160px]">
        <button
          onClick={() => {
            if (volume > 0) {
              setPrevVolume(volume);
              onVolumeChange(0);
            } else {
              onVolumeChange(prevVolume);
            }
          }}
          className="p-1.5 rounded-full transition-all duration-200"
          style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}
        >
          {volume === 0 ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="w-28 h-1 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--primary) ${volume * 100}%, var(--muted) ${volume * 100}%)`
          }}
        />
        <span className="text-xs w-8" style={{ color: 'var(--muted-foreground)' }}>
          {Math.round(volume * 100)}%
        </span>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {lastHotkey && (
          <span 
            className="text-xs px-3 py-1 rounded-full font-medium animate-fade-in"
            style={{ backgroundColor: 'rgba(52, 168, 90, 0.15)', color: 'var(--primary)' }}
          >
            ⌨ {lastHotkey}
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full transition-all duration-300 ${
            isPlaying ? 'bg-[var(--primary)]' : 'bg-[var(--muted-foreground)]'
          }`}></span>
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {showSkipToast ? '已切换下一首' : isPlaying ? '运行中' : '已就绪'}
          </span>
        </div>
      </div>
    </div>
  );
}
