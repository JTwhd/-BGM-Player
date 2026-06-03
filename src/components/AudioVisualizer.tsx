export function AudioVisualizer() {
  return (
    <div className="mt-4 relative w-full">
      <div className="w-full flex justify-center overflow-hidden rounded-xl">
        <img
          src="./team-removebg-preview.png"
          alt="DJ Character"
          className="w-full max-w-md h-auto object-contain drop-shadow-2xl"
          style={{ filter: 'drop-shadow(0 0 30px rgba(52, 168, 90, 0.3))' }}
        />
      </div>

      <div className="text-center mt-4">
        <p className="text-lg font-bold" style={{ color: 'var(--text-color)' }}>
          音乐律动
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          点击按钮播放背景音乐
        </p>
      </div>
    </div>
  );
}
