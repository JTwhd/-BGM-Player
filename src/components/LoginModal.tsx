import { useState } from 'react';
import { Lock, Mail, UserRound, X } from 'lucide-react';
import { login, register } from '../lib/auth-api';
import { AuthStorage } from '../utils/storage';
import type { AuthResponse } from '../types';
import { AnimatedLayerButton } from './ui/animated-layer-button';

interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
  avatar?: string;
  qqConnected?: boolean;
  qqNickname?: string;
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (userInfo: UserInfo) => void;
}

const toUserInfo = (user: AuthResponse): UserInfo => ({
  id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  avatar: user.avatar,
  qqConnected: user.qqConnected,
  qqNickname: user.qqNickname,
});

export function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const close = () => {
    reset();
    setMode('login');
    onClose();
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password) return setError('请输入邮箱和密码');
    if (mode === 'register' && username.trim().length < 3) return setError('用户名至少需要 3 个字符');
    if (password.length < 6) return setError('密码至少需要 6 个字符');
    if (mode === 'register' && password !== confirmPassword) return setError('两次输入的密码不一致');

    setIsLoading(true);
    setError(null);
    try {
      const result = mode === 'login'
        ? await login(email.trim(), password)
        : await register(username.trim(), email.trim(), password);
      await AuthStorage.setToken(result.token);
      await AuthStorage.setEmail(result.email);
      onLogin(toUserInfo(result));
      close();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '请求失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(event) => event.target === event.currentTarget && close()}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl p-6" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">{mode === 'login' ? '登录账号' : '注册账号'}</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>登录后可以使用云端账号服务。</p>
          </div>
          <button onClick={close} className="p-2"><X className="w-5 h-5" /></button>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg text-sm text-red-400 bg-red-500/10 border border-red-500/20">{error}</div>}

        <div className="space-y-4">
          {mode === 'register' && <Field icon={UserRound} label="用户名"><input value={username} onChange={(event) => setUsername(event.target.value)} className="input" /></Field>}
          <Field icon={Mail} label="邮箱"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" /></Field>
          <Field icon={Lock} label="密码"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleSubmit()} className="input" /></Field>
          {mode === 'register' && <Field icon={Lock} label="确认密码"><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleSubmit()} className="input" /></Field>}

          <AnimatedLayerButton onClick={handleSubmit} disabled={isLoading} className="w-full">
            {isLoading ? '提交中...' : mode === 'login' ? '登录' : '注册'}
          </AnimatedLayerButton>
          <button onClick={() => { reset(); setMode(mode === 'login' ? 'register' : 'login'); }} className="w-full text-sm" style={{ color: 'var(--accent)' }}>
            {mode === 'login' ? '没有账号？立即注册' : '已有账号？返回登录'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: typeof Lock; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm mb-2" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" />
        <div className="[&_.input]:w-full [&_.input]:pl-10 [&_.input]:pr-4 [&_.input]:py-3 [&_.input]:rounded-xl [&_.input]:bg-[var(--input-bg)] [&_.input]:border [&_.input]:border-[var(--border)]">
          {children}
        </div>
      </div>
    </label>
  );
}
