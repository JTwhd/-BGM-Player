import { useEffect, useState } from 'react';
import { Cloud, Download, LogIn, Play, RefreshCw } from 'lucide-react';
import { playFilePreview, addTrack, saveOnlineAudio } from '../lib/tauri-api';
import { API_BASE_URL } from '../lib/api-config';
import { getToken } from '../lib/auth-api';

interface OnlineTrack {
  _id: string;
  name: string;
  artist: string;
  category: 'victory' | 'defeat' | 'neutral';
  tags: string[];
  duration: number;
  url: string;
  plays: number;
}

export default function OnlineLibrary() {
  const [tracks, setTracks] = useState<OnlineTrack[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const token = getToken();

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2500);
  };

  const loadTracks = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/tracks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '在线曲库加载失败');
      setTracks(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '在线曲库加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTracks();
  }, []);

  const downloadAudio = async (track: OnlineTrack, preview: boolean) => {
    const safeName = track.name.replace(/[<>:"/\\|?*]/g, '_');
    const extension = new URL(track.url).pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1] || 'mp3';
    const fileName = `${preview ? `_preview_${track._id}` : safeName}.${extension}`;
    const response = await fetch(track.url);
    if (!response.ok) throw new Error(`下载失败: HTTP ${response.status}`);
    return saveOnlineAudio(fileName, Array.from(new Uint8Array(await response.arrayBuffer())));
  };

  const handlePreview = async (track: OnlineTrack) => {
    setPlayingId(track._id);
    try {
      await playFilePreview(await downloadAudio(track, true));
    } catch (previewError) {
      showToast(previewError instanceof Error ? previewError.message : '试听失败');
    } finally {
      setPlayingId(null);
    }
  };

  const handleDownload = async (track: OnlineTrack) => {
    setDownloadingId(track._id);
    try {
      const filePath = await downloadAudio(track, false);
      await addTrack({
        id: `online-${track._id}`,
        name: track.name,
        path: filePath,
        category: track.category === 'defeat' ? 'defeat' : 'victory',
        favorite: false,
        tags: track.tags,
      });
      showToast(`已下载：${track.name}`);
    } catch (downloadError) {
      showToast(downloadError instanceof Error ? downloadError.message : '下载失败');
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredTracks = selectedCategory === 'all'
    ? tracks
    : tracks.filter((track) => track.category === selectedCategory);

  if (!token) {
    return (
      <div className="card-container max-w-lg mx-auto mt-12 p-8 text-center">
        <LogIn className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--primary)' }} />
        <h2 className="text-xl font-bold mb-2">登录后使用在线曲库</h2>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>在线曲库与云端账号绑定，请先点击右上角登录。</p>
      </div>
    );
  }

  return (
    <div className="card-container p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Cloud className="w-7 h-7" style={{ color: 'var(--primary)' }} />
          <div>
            <h2 className="text-xl font-bold">在线曲库</h2>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>从云端下载 BGM 到本机曲库。</p>
          </div>
        </div>
        <button onClick={loadTracks} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--muted)' }}>
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg text-sm text-red-400 bg-red-500/10">{error}</div>}
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl" style={{ backgroundColor: 'var(--card)', color: 'var(--primary)' }}>{toast}</div>}

      <div className="flex gap-2 mb-6">
        {[
          ['all', '全部'],
          ['victory', '胜利'],
          ['defeat', '失败'],
        ].map(([value, label]) => (
          <button key={value} onClick={() => setSelectedCategory(value)} className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: selectedCategory === value ? 'rgba(52,168,90,.18)' : 'var(--muted)', color: selectedCategory === value ? 'var(--primary)' : 'var(--muted-foreground)' }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center" style={{ color: 'var(--muted-foreground)' }}>正在加载在线曲库...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTracks.map((track) => (
            <div key={track._id} className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}>
              <h3 className="font-bold mb-1">{track.name}</h3>
              <p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>{track.artist || '未填写歌手'} · {Math.round(track.duration || 0)} 秒</p>
              <div className="flex flex-wrap gap-1 mb-4">
                {track.tags.map((tag) => <span key={tag} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--card)' }}>{tag}</span>)}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handlePreview(track)} disabled={playingId === track._id} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--card)' }}><Play className="w-4 h-4" />{playingId === track._id ? '加载中' : '试听'}</button>
                <button onClick={() => handleDownload(track)} disabled={downloadingId === track._id} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}><Download className="w-4 h-4" />{downloadingId === track._id ? '下载中' : '下载'}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredTracks.length === 0 && <div className="py-12 text-center" style={{ color: 'var(--muted-foreground)' }}>暂无在线曲目，请在后台添加内容。</div>}
    </div>
  );
}
