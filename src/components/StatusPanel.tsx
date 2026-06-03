import { useState, useEffect } from 'react';
import { getStatus } from '../lib/tauri-api';

interface StatusPanelProps {
  onStop?: () => void;
}

export function StatusPanel({ onStop }: StatusPanelProps) {
  const [status, setStatus] = useState({
    bgm_service: false,
    audio_output: '未知',
    hotkeys_enabled: false,
    team_hearing: false,
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const result = await getStatus();
        setStatus(result);
      } catch (error) {
        console.error('获取状态失败:', error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const statusItems = [
    { 
      name: '后台服务', 
      status: status.bgm_service ? 'running' : 'stopped', 
      value: status.bgm_service ? '运行中' : '已停止' 
    },
    { 
      name: '音频输出', 
      status: status.audio_output !== '未知' ? 'running' : 'stopped', 
      value: status.audio_output === 'default' ? '默认设备' : status.audio_output 
    },
    { 
      name: '全局快捷键', 
      status: status.hotkeys_enabled ? 'running' : 'stopped', 
      value: status.hotkeys_enabled ? '已启用' : '已禁用' 
    },
    { 
      name: '队友可听见', 
      status: status.team_hearing ? 'running' : 'stopped', 
      value: status.team_hearing ? '已启用' : '已禁用' 
    },
  ];

  return (
    <div className="card-container p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold" style={{ color: 'var(--card-foreground)' }}>运行状态</h3>
        <div className={`w-2 h-2 rounded-full ${status.bgm_service ? 'bg-[var(--primary)] animate-pulse' : 'bg-[var(--muted-foreground)]'}`} />
      </div>
      
      <div className="space-y-3">
        {statusItems.map(item => (
          <div 
            key={item.name} 
            className="flex items-center justify-between p-3 rounded-lg transition-all duration-200"
            style={{ backgroundColor: 'var(--muted)' }}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                item.status === 'running' 
                  ? 'bg-[var(--primary)]/20' 
                  : 'bg-[var(--muted)]'
              }`}>
                <svg className={`w-4 h-4 ${
                  item.status === 'running' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
                }`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {item.name === '后台服务' && <path d="M22 12h-4l-3 9L9 3l-3 9H2" />}
                  {item.name === '音频输出' && <path d="M12 2a9 9 0 0 0-9 9 9.75 9.75 0 0 0 6.74 9.26L12 22l2.26-1.74A9.75 9.75 0 0 0 21 11a9 9 0 0 0-9-9z" />}
                  {item.name === '全局快捷键' && <path d="M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5z" />}
                  {item.name === '队友可听见' && <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />}
                </svg>
              </div>
              <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{item.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                item.status === 'running' ? 'bg-[var(--primary)]' : 'bg-[var(--muted-foreground)]'
              }`}></span>
              <span className={`text-sm ${
                item.status === 'running' ? 'text-[var(--primary)] font-medium' : 'text-[var(--muted-foreground)]'
              }`}>
                {item.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {onStop && (
        <>
          <button
            onClick={onStop}
            className="w-full mt-4 px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            </svg>
            停止播放
          </button>
          <img 
            src="./dj-character.png" 
            alt="DJ Character" 
            className="w-32 h-auto object-contain mx-auto mt-4"
          />
        </>
      )}
    </div>
  );
}
