import { AnimatedLayerButton } from './ui/animated-layer-button';

interface HotkeyPanelProps {
  onNavigateHotkey: () => void;
}

export function HotkeyPanel({ onNavigateHotkey }: HotkeyPanelProps) {
  const hotkeyItems = [
    { key: 'victory_key', label: '胜利播放', keyCode: 'Numpad1', color: 'primary' },
    { key: 'defeat_key', label: '失败播放', keyCode: 'Numpad2', color: 'destructive' },
    { key: 'stop_key', label: '暂停播放', keyCode: 'Numpad0', color: 'muted' },
  ];

  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#34a85a' }}>
          <svg className="w-4 h-4" style={{ color: 'var(--primary-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
            <path d="M9 9h6M9 12h6M9 15h4" />
          </svg>
        </div>
        <div className="text-base font-bold" style={{ color: 'var(--text-color)' }}>快捷键</div>
      </div>

      <div className="space-y-3">
        {hotkeyItems.map(item => (
          <div key={item.key} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border)' }}>
            <span className="text-sm" style={{ color: 'var(--text-color)' }}>{item.label}</span>
            <button className="px-4 py-2 rounded-lg text-sm w-44 text-center transition-all" style={{ backgroundColor: '#34a85a', color: '#ffffff', border: 'none', boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.08)' }}>
              {item.keyCode}
            </button>
          </div>
        ))}
      </div>

      <AnimatedLayerButton
        onClick={onNavigateHotkey}
        className="w-full mt-4"
      >
        更多快捷键设置
      </AnimatedLayerButton>
    </div>
  );
}
