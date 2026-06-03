import { useState } from 'react';
import { login } from '../lib/auth-api';
import { AuthResponse } from '../types';
import { AnimatedLayerButton } from './ui/animated-layer-button';
import { AvatarPicker } from './ui/avatar-picker';

interface LoginPageProps {
  onLogin: (user: AuthResponse) => void;
  onNavigateRegister: () => void;
}

export function LoginPage({ onLogin, onNavigateRegister }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [, setSelectedAvatarId] = useState<number>(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b0f19] via-[#1a1f35] to-[#0b0f19] py-8">
      <div className="w-full max-w-md p-8">
        <AvatarPicker onSelectAvatarChange={setSelectedAvatarId} />
        
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl mt-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">BGM Player</h1>
            <p className="text-gray-400">登录您的账号</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                placeholder="请输入邮箱"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                placeholder="请输入密码"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <AnimatedLayerButton
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? '登录中...' : '登录'}
            </AnimatedLayerButton>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              还没有账号？{' '}
              <button
                onClick={onNavigateRegister}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                立即注册
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}