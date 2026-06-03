import { CalendarDays, Clock3, Mail, ShieldCheck, UserRound } from 'lucide-react';
import type { UserProfile } from '../types';
import { AnimatedLayerButton } from './ui/animated-layer-button';

interface ProfileProps {
  user: UserProfile | null;
  onNavigateSettings: () => void;
}

const formatDate = (date?: string) => {
  if (!date) return '暂无记录';
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export function Profile({ user, onNavigateSettings }: ProfileProps) {
  if (!user) {
    return (
      <div className="card-container max-w-xl mx-auto p-8 text-center">
        <UserRound className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--muted-foreground)' }} />
        <h1 className="text-xl font-bold mb-2">个人中心</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>登录后可以查看和修改云端账号资料。</p>
      </div>
    );
  }

  const rows = [
    { icon: Mail, label: '邮箱', value: user.email },
    { icon: ShieldCheck, label: '账号类型', value: user.role === 'admin' ? '管理员' : '普通用户' },
    { icon: CalendarDays, label: '注册时间', value: formatDate(user.createdAt) },
    { icon: Clock3, label: '最近更新', value: formatDate(user.updatedAt) },
  ];

  return (
    <div className="card-container p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">个人中心</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>查看你的云端账号信息。</p>
      </div>

      <div className="p-6 rounded-xl mb-5" style={{ backgroundColor: 'var(--muted)' }}>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
            <span className="text-xl font-bold" style={{ color: 'var(--primary-foreground)' }}>
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold">{user.username}</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>云端账号已登录</p>
          </div>
        </div>

        <div className="space-y-3">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between gap-3 py-2">
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                <Icon className="w-4 h-4" />
                {label}
              </div>
              <span className="text-sm text-right">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <AnimatedLayerButton onClick={onNavigateSettings} className="w-full">
        修改账号资料
      </AnimatedLayerButton>
    </div>
  );
}
