import { useState } from 'react';
import type { HotkeyConfig } from '../types';

interface HotkeyBinderProps {
  hotkeys: HotkeyConfig;
  onUpdate: (key: keyof HotkeyConfig, value: string) => void;
}

const hotkeyItems = [
  { key: 'victory_key' as const, label: '胜利 BGM', default: 'Numpad1', color: 'primary' },
  { key: 'defeat_key' as const, label: '失败 BGM', default: 'Numpad2', color: 'destructive' },
  { key: 'stop_key' as const, label: '暂停播放', default: 'Numpad0', color: 'muted' },
];

export function HotkeyBinder({ hotkeys, onUpdate }: HotkeyBinderProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const handleKeyDown = (itemKey: keyof HotkeyConfig) => (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    if (e.metaKey) parts.push('Meta');
    const code = e.code;
    if (code.startsWith('Control') || code.startsWith('Shift') || code.startsWith('Alt') || code.startsWith('Meta')) return '';
    parts.push(code);
    const formatted = parts.join('+');
    if (formatted) {
      onUpdate(itemKey, formatted);
      setActiveKey(null);
    }
  };

  return (
    <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#34a85a' }}>
          <svg className="w-5 h-5" style={{ color: 'var(--primary-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
            <path d="M9 9h6M9 12h6M9 15h4" />
          </svg>
        </div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>热键设置</h2>
      </div>

      <div className="space-y-3">
        {hotkeyItems.map(item => (
          <div key={item.key} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#34a85a' }}>
                {item.key === 'victory_key' && (
                  <svg className="w-4 h-4" style={{ color: 'var(--primary-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                )}
                {item.key === 'defeat_key' && (
                  <svg className="w-4 h-4" style={{ color: 'var(--primary-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
                )}
                {item.key === 'stop_key' && (
                  <svg className="w-4 h-4" style={{ color: 'var(--primary-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                )}
              </div>
              <span className="text-sm" style={{ color: 'var(--text-color)' }}>{item.label}</span>
            </div>
            <button
              onClick={() => setActiveKey(item.key)}
              onKeyDown={handleKeyDown(item.key)}
              onFocus={() => setActiveKey(item.key)}
              onBlur={() => setActiveKey(null)}
              className="px-4 py-2 rounded-lg text-sm w-44 text-center transition-all"
              style={{ 
                backgroundColor: '#34a85a', 
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.08)'
              }}
            >
              {activeKey === item.key ? '按下按键...' : hotkeys[item.key]}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border)' }}>
        <h3 className="text-sm font-medium mb-2" style={{ color: '#34a85a' }}>提示</h3>
        <div className="text-xs space-y-1" style={{ color: 'var(--secondary-text)' }}>
          <p>点击右侧按键区域，然后按下键盘按键即可绑定</p>
          <p>支持组合键: Ctrl/Shift/Alt + 任意键</p>
        </div>
      </div>
    </div>
  );
}
