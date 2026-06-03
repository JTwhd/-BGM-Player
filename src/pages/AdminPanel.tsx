import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Database, Music2, RefreshCw, ShieldCheck, Trash2, Upload, Users, type LucideIcon } from 'lucide-react';
import { deleteAdminTrack, getAdminOverview, getAdminTracks, getAdminUsers, uploadAdminTrack, type AdminOverview, type AdminTrack, type AdminUser } from '../lib/admin-api';

interface AdminPanelProps {
  onLogout: () => void;
}

const formatDate = (date: string) => new Date(date).toLocaleDateString('zh-CN');

export function AdminPanel({ onLogout }: AdminPanelProps) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tracks, setTracks] = useState<AdminTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [trackName, setTrackName] = useState('');
  const [trackCategory, setTrackCategory] = useState<'victory' | 'defeat'>('victory');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const uploadInProgressRef = useRef(false);
  const stats: Array<[string, number | string, LucideIcon]> = [
    ['注册用户', overview?.userCount ?? '-', Users],
    ['管理员', overview?.adminCount ?? '-', ShieldCheck],
    ['在线曲目', overview?.trackCount ?? '-', Database],
  ];

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextOverview, nextUsers, nextTracks] = await Promise.all([getAdminOverview(), getAdminUsers(), getAdminTracks()]);
      setOverview(nextOverview);
      setUsers(nextUsers);
      setTracks(nextTracks);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '后台数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpload = async () => {
    if (uploadInProgressRef.current) return;
    if (!trackName.trim() || !audioFile) {
      setError('请填写曲目名称并选择音频文件');
      return;
    }
    uploadInProgressRef.current = true;
    setUploading(true);
    setError('');
    try {
      await uploadAdminTrack(audioFile, trackName.trim(), trackCategory);
      setTrackName('');
      setAudioFile(null);
      await loadData();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '上传失败');
    } finally {
      uploadInProgressRef.current = false;
      setUploading(false);
    }
  };

  const handleDeleteTrack = async (track: AdminTrack) => {
    if (!confirm(`确定删除在线曲目“${track.name}”吗？`)) return;
    try {
      await deleteAdminTrack(track._id);
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除失败');
    }
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-7 h-7" style={{ color: 'var(--primary)' }} />
              <h1 className="text-2xl font-bold">内测管理后台</h1>
            </div>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>查看云端用户和在线内容状态。</p>
          </div>
          <div className="flex gap-3">
            <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}><RefreshCw className="w-4 h-4" />刷新</button>
            <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}><ArrowLeft className="w-4 h-4" />返回主界面</button>
          </div>
        </div>

        {error && <div className="mb-5 px-4 py-3 rounded-lg text-sm text-red-400" style={{ backgroundColor: 'rgba(239,68,68,.12)' }}>{error}</div>}

        <div className="grid grid-cols-3 gap-4 mb-6">
          {stats.map(([label, value, Icon]) => (
            <div key={label} className="card-container p-5">
              <Icon className="w-5 h-5 mb-3" style={{ color: 'var(--primary)' }} />
              <p className="text-sm mb-1" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        <div className="card-container overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-bold">用户列表</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center" style={{ color: 'var(--muted-foreground)' }}>正在加载...</div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {users.map((user) => (
                <div key={user._id} className="grid grid-cols-[1.2fr_1.8fr_.8fr_1fr] gap-4 px-5 py-4 text-sm items-center">
                  <span className="font-medium">{user.username}</span>
                  <span style={{ color: 'var(--muted-foreground)' }}>{user.email}</span>
                  <span style={{ color: user.role === 'admin' ? 'var(--primary)' : 'var(--muted-foreground)' }}>{user.role === 'admin' ? '管理员' : '普通用户'}</span>
                  <span style={{ color: 'var(--muted-foreground)' }}>{formatDate(user.createdAt)}</span>
                </div>
              ))}
              {users.length === 0 && <div className="p-8 text-center" style={{ color: 'var(--muted-foreground)' }}>暂无用户</div>}
            </div>
          )}
        </div>

        <div className="card-container mt-6 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <h2 className="font-bold">上传在线曲目</h2>
          </div>
          <div className="grid grid-cols-[1.2fr_.7fr_1.5fr_auto] gap-3">
            <input value={trackName} onChange={(event) => setTrackName(event.target.value)} placeholder="曲目名称" className="px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }} />
            <select value={trackCategory} onChange={(event) => setTrackCategory(event.target.value as 'victory' | 'defeat')} className="px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }}>
              <option value="victory">胜利</option>
              <option value="defeat">失败</option>
            </select>
            <input type="file" accept="audio/*" onChange={(event) => setAudioFile(event.target.files?.[0] || null)} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--muted)', border: '1px solid var(--border)' }} />
            <button onClick={handleUpload} disabled={uploading} className="px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>{uploading ? '上传中...' : '上传'}</button>
          </div>
        </div>

        <div className="card-container mt-6 overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <Music2 className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <h2 className="font-bold">在线曲目列表</h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {tracks.map((track) => (
              <div key={track._id} className="grid grid-cols-[1.4fr_.7fr_.6fr_auto] gap-4 px-5 py-4 text-sm items-center">
                <span className="font-medium">{track.name}</span>
                <span style={{ color: 'var(--muted-foreground)' }}>{track.category === 'victory' ? '胜利' : track.category === 'defeat' ? '失败' : '中性'}</span>
                <span style={{ color: 'var(--muted-foreground)' }}>{track.plays || 0} 次播放</span>
                <button onClick={() => handleDeleteTrack(track)} className="p-2 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {tracks.length === 0 && <div className="p-8 text-center" style={{ color: 'var(--muted-foreground)' }}>暂无在线曲目</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
