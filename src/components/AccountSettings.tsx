import { useState } from 'react';
import { ArrowLeft, Lock, Mail, Shield, User } from 'lucide-react';
import type { User as AccountUser } from '../types';
import { changePassword, updateUser } from '../lib/auth-api';
import { AnimatedLayerButton } from './ui/animated-layer-button';

interface AccountSettingsProps {
  onBack: () => void;
  user: AccountUser;
  onUserUpdated: (user: AccountUser) => void;
}

export function AccountSettings({ onBack, user, onUserUpdated }: AccountSettingsProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [username, setUsername] = useState(user.username);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveProfile = async () => {
    if (username.trim().length < 3) return showToast('用户名至少需要 3 个字符');
    setLoading(true);
    try {
      const result = await updateUser(username.trim());
      onUserUpdated({ ...user, ...result });
      showToast('资料保存成功');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return showToast('请填写全部密码字段');
    if (newPassword !== confirmPassword) return showToast('两次输入的新密码不一致');
    if (newPassword.length < 6) return showToast('新密码至少需要 6 个字符');
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('密码修改成功');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="p-2 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-2xl font-bold">账号设置</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>管理用户名和登录密码。</p>
        </div>
      </div>

      {toast && <div className="fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-xl" style={{ backgroundColor: 'var(--card)', color: 'var(--primary)' }}>{toast}</div>}

      <div className="grid grid-cols-[180px_1fr] gap-6">
        <div className="card-container p-2 h-fit">
          <button onClick={() => setActiveTab('profile')} className="w-full flex gap-3 px-4 py-3 rounded-lg text-left" style={{ color: activeTab === 'profile' ? 'var(--primary)' : 'var(--muted-foreground)' }}><User className="w-5 h-5" />个人资料</button>
          <button onClick={() => setActiveTab('security')} className="w-full flex gap-3 px-4 py-3 rounded-lg text-left" style={{ color: activeTab === 'security' ? 'var(--primary)' : 'var(--muted-foreground)' }}><Shield className="w-5 h-5" />安全设置</button>
        </div>

        <div className="card-container p-6">
          {activeTab === 'profile' ? (
            <div className="space-y-5">
              <h2 className="text-lg font-bold">个人资料</h2>
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}><Mail className="w-5 h-5" /><span>{user.email}</span></div>
              <label className="block">
                <span className="block text-sm mb-2" style={{ color: 'var(--muted-foreground)' }}>用户名</span>
                <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-full px-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border)' }} />
              </label>
              <AnimatedLayerButton onClick={handleSaveProfile} disabled={loading} className="w-auto">{loading ? '保存中...' : '保存修改'}</AnimatedLayerButton>
            </div>
          ) : (
            <div className="space-y-5">
              <h2 className="text-lg font-bold">修改密码</h2>
              {[
                ['当前密码', currentPassword, setCurrentPassword],
                ['新密码', newPassword, setNewPassword],
                ['确认新密码', confirmPassword, setConfirmPassword],
              ].map(([label, value, setter]) => (
                <label className="block" key={label as string}>
                  <span className="block text-sm mb-2" style={{ color: 'var(--muted-foreground)' }}>{label as string}</span>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" />
                    <input type="password" value={value as string} onChange={(event) => (setter as (value: string) => void)(event.target.value)} className="w-full pl-10 pr-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--border)' }} />
                  </div>
                </label>
              ))}
              <AnimatedLayerButton onClick={handleChangePassword} disabled={loading} className="w-auto">{loading ? '修改中...' : '修改密码'}</AnimatedLayerButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
