import React, { useEffect, useState, useRef } from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const Button = ({ children, onClick, className = '', disabled = false, type = 'button' }: ButtonProps) => {
  const [bars, setBars] = useState<number[]>([]);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const generateBars = () => {
      const newBars = Array.from({ length: 12 }, () => Math.random() * 100);
      setBars(newBars);
    };
    generateBars();
    intervalRef.current = window.setInterval(generateBars, 120);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="flex items-end justify-center gap-1 h-20 w-full px-4">
        {bars.map((height, index) => (
          <div
            key={index}
            className="w-2 rounded-full transition-all duration-100"
            style={{
              height: `${Math.max(10, height * 0.7)}px`,
              backgroundColor: height > 70 ? '#34a85a' : height > 40 ? '#22c55e' : '#555555',
              animation: `pulse ${0.3 + (height / 100) * 0.4}s ease-in-out infinite alternate`,
              animationDelay: `${index * 0.05}s`,
            }}
          />
        ))}
      </div>
      
      <div className="flex items-center gap-4 text-2xl">
        <span 
          className="text-green-500"
          style={{ 
            animation: `bounce 0.6s ease-in-out infinite`,
            animationDelay: '0s'
          }}
        >
          ♪
        </span>
        <span 
          className="text-green-400"
          style={{ 
            animation: `bounce 0.6s ease-in-out infinite`,
            animationDelay: '0.15s'
          }}
        >
          ♫
        </span>
        <span 
          className="text-green-500"
          style={{ 
            animation: `bounce 0.6s ease-in-out infinite`,
            animationDelay: '0.3s'
          }}
        >
          ♩
        </span>
        <span 
          className="text-green-400"
          style={{ 
            animation: `bounce 0.6s ease-in-out infinite`,
            animationDelay: '0.45s'
          }}
        >
          ♬
        </span>
      </div>
      
      <button 
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`rainbow-border relative h-14 flex items-center justify-center gap-3 px-6 bg-black rounded-xl border-none text-white cursor-pointer font-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {children}
      </button>
      
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }
        .rainbow-border::before,
        .rainbow-border::after {
          content: '';
          position: absolute;
          left: -2px;
          top: -2px;
          border-radius: 12px;
          background: linear-gradient(45deg, #fb0094, #0000ff, #00ff00, #ffff00, #ff0000, #fb0094, #0000ff, #00ff00, #ffff00, #ff0000);
          background-size: 400%;
          width: calc(100% + 4px);
          height: calc(100% + 4px);
          z-index: -1;
          animation: rainbow 20s linear infinite;
        }
        .rainbow-border::after {
          filter: blur(50px);
        }
        @keyframes rainbow {
          0% { background-position: 0 0; }
          50% { background-position: 400% 0; }
          100% { background-position: 0 0; }
        }
      `}</style>
    </div>
  );
};
