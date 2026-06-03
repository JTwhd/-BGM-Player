import type { BgmTrack } from '../types';

interface NowPlayingProps {
  track: BgmTrack | null;
  isPlaying: boolean;
  onStop: () => void;
}

export function NowPlaying({ track, isPlaying, onStop }: NowPlayingProps) {
  if (!track) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
          <span className="text-4xl opacity-50">🎵</span>
        </div>
        <div className="text-xl text-gray-400 mb-2">等待播放</div>
        <div className="text-gray-500 text-sm">按快捷键开始你的表演</div>
        <div className="mt-4 flex justify-center gap-3">
          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs border border-green-500/30">Numpad1 胜利</span>
          <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs border border-red-500/30">Numpad2 失败</span>
        </div>
      </div>
    );
  }

  const isVictory = track.category === 'victory';

  return (
    <div className={`glass-card rounded-2xl p-6 ${isVictory ? 'victory-glow' : 'defeat-glow'} transition-all duration-500`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
            isVictory 
              ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
              : 'bg-gradient-to-br from-red-500 to-rose-600'
          } shadow-lg`}>
            <span className="text-2xl">{isVictory ? '🏆' : '💔'}</span>
          </div>
          <div>
            <div className={`px-2 py-0.5 rounded text-xs font-medium inline-block mb-1 ${
              isVictory 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {isVictory ? '🎉 胜利时刻' : '😢 失败时刻'}
            </div>
            <h3 className="text-xl font-bold text-white">{track.name}</h3>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            isPlaying 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400 playing-indicator' : 'bg-gray-400'}`}></span>
            <span className="font-medium">{isPlaying ? '播放中' : '已暂停'}</span>
          </div>
          <button
            onClick={onStop}
            className="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-medium shadow-lg shadow-red-500/30 transition-all"
          >
            ⏹ 停止
          </button>
        </div>
      </div>

      {isPlaying && (
        <div className="flex items-center justify-center gap-1 mt-4">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i}
              className="w-1 bg-gradient-to-t from-purple-500 to-blue-500 rounded-full wave-animation"
              style={{ 
                height: `${20 + Math.random() * 20}px`,
                animationDelay: `${i * 0.1}s`
              }}
            ></div>
          ))}
        </div>
      )}
    </div>
  );
}
