import { AnimatedLayerButton } from '../ui/animated-layer-button';

interface FileSelectorProps {
  value: string;
  onSelect: () => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  buttonText?: string;
  isLoading?: boolean;
}

export function FileSelector({
  value,
  onSelect,
  disabled = false,
  placeholder = "选择要剪辑的音频文件...",
  label = "输入音频文件",
  buttonText = "选择文件",
  isLoading = false
}: FileSelectorProps) {
  const getFileName = (path: string) => {
    return path.split('\\').pop() || path;
  };

  return (
    <div>
      <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--muted-foreground)' }}>
        <svg className="w-4 h-4 inline mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        {label}
      </label>
      <div className="flex gap-3">
        <input
          type="text"
          value={value}
          readOnly
          className="flex-1 px-4 py-2.5 rounded-lg border outline-none transition-all text-sm"
          style={{
            backgroundColor: 'var(--muted)',
            color: 'var(--foreground)',
            borderColor: 'var(--border)'
          }}
          placeholder={placeholder}
        />
        <AnimatedLayerButton
          onClick={onSelect}
          disabled={disabled || isLoading}
          className="w-auto"
        >
          {isLoading ? '加载中...' : buttonText}
        </AnimatedLayerButton>
      </div>
      {value && (
        <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
          已选择: {getFileName(value)}
        </p>
      )}
    </div>
  );
}
