import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface UserInfo {
  email: string;
  username: string;
  role: 'user' | 'admin';
}

interface HeaderProps {
  user: UserInfo | null;
  onLoginClick: () => void;
  onLogout: () => void;
}

export function Header({ user, onLoginClick, onLogout }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="flex justify-between items-center h-14">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
          <span style={{ color: 'var(--primary-foreground)', fontSize: '14px', fontWeight: 'bold' }}>B</span>
        </div>
        <h1 className="text-xl font-bold">BGM Player</h1>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        {user ? (
          <div className="relative">
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 p-1.5 pr-3 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
                <span className="text-xs font-bold" style={{ color: 'var(--primary-foreground)' }}>{user.username.charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-sm font-medium">{user.username}</span>
              <span className={`text-xs transition-transform ${showUserMenu ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-60 rounded-xl shadow-xl py-2 z-20" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <p className="text-sm font-semibold">{user.email}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--primary)' }}>{user.role === 'admin' ? '管理员账号' : '云端账号已登录'}</p>
                </div>
                <button onClick={() => { onLogout(); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  <LogOut className="w-4 h-4" />
                  退出登录
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={onLoginClick} className="px-5 py-2.5 rounded-lg font-medium text-sm" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>登录</button>
        )}
      </div>
    </header>
  );
}
