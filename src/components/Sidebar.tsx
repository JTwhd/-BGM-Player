import { useState } from 'react';
import { Bot, ChevronLeft, ChevronRight, Cloud, Gauge, KeyRound, Library, Music2, Settings, UserRound, Wrench } from 'lucide-react';
import type { BgmTrack } from '../types';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: any) => void;
  isPlaying: boolean;
  track: BgmTrack | null;
}

const menuItems = [
  { id: 'home', label: '首页', icon: Gauge },
  { id: 'library', label: '曲库', icon: Library },
  { id: 'online', label: '在线', icon: Cloud },
  { id: 'ai', label: '推荐', icon: Bot },
  { id: 'tools', label: '工具', icon: Wrench },
  { id: 'hotkey', label: '快捷键', icon: KeyRound },
  { id: 'settings', label: '设置', icon: Settings },
  { id: 'profile', label: '个人中心', icon: UserRound },
];

export function Sidebar({ currentPage, onPageChange, isPlaying, track }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className="h-full flex flex-col py-4 transition-all duration-300" style={{ backgroundColor: 'var(--sidebar)', width: isCollapsed ? '64px' : '220px', borderRight: '1px solid var(--sidebar-border)' }}>
      <div className="flex items-center justify-between mb-5 px-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--primary)' }}>
          <Music2 className="w-5 h-5" style={{ color: 'var(--primary-foreground)' }} />
        </div>
        {!isCollapsed && <span className="text-base font-semibold">BGM</span>}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="w-7 h-7 rounded-md flex items-center justify-center">
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex flex-col gap-0.5 px-2 flex-1">
        {menuItems.map(({ id, label, icon: Icon }) => {
          const isActive = currentPage === id;
          return (
            <button key={id} onClick={() => onPageChange(id)} className="flex items-center gap-3 h-10 px-3 rounded-lg" style={{ backgroundColor: isActive ? 'rgba(52, 168, 90, 0.12)' : 'transparent', color: isActive ? 'var(--primary)' : 'var(--sidebar-foreground)' }}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">{label}</span>}
            </button>
          );
        })}

      </nav>

      {track && (
        <button className="mx-2 p-2 rounded-lg text-left" style={{ backgroundColor: 'var(--muted)' }} onClick={() => onPageChange('library')}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: track.category === 'defeat' ? '#ef4444' : 'var(--primary)' }}>
              <span className="text-xs font-bold text-white">{track.name.charAt(0)}</span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{track.name}</p>
                <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{track.category === 'defeat' ? '失败曲目' : '胜利曲目'}</p>
              </div>
            )}
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isPlaying ? 'var(--primary)' : 'var(--sidebar-border)' }} />
          </div>
        </button>
      )}
    </aside>
  );
}
