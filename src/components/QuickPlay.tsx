import { AudioVisualizer } from './AudioVisualizer';

interface QuickPlayProps {
  onPlay: (category: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function QuickPlay({ onPlay, isLoading, error }: QuickPlayProps) {
  return (
    <div className="card-container p-6">
      {error && (
        <div 
          className="mb-5 p-4 rounded-lg text-sm"
          style={{ 
            backgroundColor: 'var(--input-bg)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            color: '#ef4444'
          }}
        >
          {error.includes('没有可用的BGM') ? '曲库为空，请先去"音乐库"页面添加音频文件' : error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => onPlay('victory')}
          disabled={isLoading}
          className="group relative h-[140px] rounded-lg p-5 overflow-hidden flex flex-col justify-between cursor-pointer transition-all duration-300 card-hover-lift"
          style={{ 
            backgroundColor: 'var(--input-bg)',
            border: '1px solid var(--border)'
          }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300"
              style={{ backgroundColor: '#34a85a' }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span style={{ color: 'var(--primary-foreground)', fontSize: '20px', fontWeight: 'bold' }}>V</span>
              )}
            </div>
            <div>
              <div 
                className="text-lg font-bold"
                style={{ color: 'var(--text-color)' }}
              >
                胜利播放
              </div>
              <div 
                className="text-sm"
                style={{ color: 'var(--secondary-text)' }}
              >
                {isLoading ? '加载中...' : '燃爆全场'}
              </div>
            </div>
          </div>

          <div 
            className="absolute bottom-5 right-5 w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 shadow-md"
            style={{ backgroundColor: '#34a85a' }}
          >
            <svg className="w-5 h-5 ml-0.5" style={{ color: 'var(--primary-foreground)' }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </button>

        <button
          onClick={() => onPlay('defeat')}
          disabled={isLoading}
          className="group relative h-[140px] rounded-lg p-5 overflow-hidden flex flex-col justify-between cursor-pointer transition-all duration-300 card-hover-lift"
          style={{ 
            backgroundColor: 'var(--input-bg)',
            border: '1px solid var(--border)'
          }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300"
              style={{ backgroundColor: '#ef4444' }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>D</span>
              )}
            </div>
            <div>
              <div 
                className="text-lg font-bold"
                style={{ color: 'var(--text-color)' }}
              >
                失败播放
              </div>
              <div 
                className="text-sm"
                style={{ color: 'var(--secondary-text)' }}
              >
                {isLoading ? '加载中...' : '伤感落寞'}
              </div>
            </div>
          </div>

          <div 
            className="absolute bottom-5 right-5 w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 shadow-md"
            style={{ backgroundColor: '#ef4444' }}
          >
            <svg className="w-5 h-5 ml-0.5" style={{ color: 'white' }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </button>
      </div>

      <AudioVisualizer />
    </div>
  );
}
