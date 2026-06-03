import { useState, useEffect, useRef } from 'react';
import type { BgmTrack } from '../types';
import { addTrack, deleteTrack, renameTrack, toggleFavorite, pickAudioFiles } from '../lib/tauri-api';
import { getConfig } from '../lib/tauri-api';
import { AnimatedLayerButton } from './ui/animated-layer-button';

interface BgmLibraryProps {
  onPlaySpecific?: (trackId: string) => Promise<void>;
}

export function BgmLibrary({ onPlaySpecific }: BgmLibraryProps) {
  const [tracks, setTracks] = useState<BgmTrack[]>([]);
  const [activeTab, setActiveTab] = useState<'victory' | 'defeat'>('victory');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTracks();
  }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const loadTracks = async () => {
    try {
      const config = await getConfig();
      setTracks(config.tracks);
      setErrorMsg(null);
    } catch (error) {
      setErrorMsg('加载曲库失败: ' + String(error));
    }
  };

  const handleAddFiles = async () => {
    try {
      const paths = await pickAudioFiles();
      if (!paths || paths.length === 0) return;

      let addedCount = 0;
      for (const filePath of paths) {
        const fileName = filePath.split(/[\\/]/).pop() || filePath;
        const name = fileName.replace(/\.[^.]+$/, '');
        const id = `track-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const track: BgmTrack = {
          id,
          name,
          path: filePath,
          category: activeTab,
          favorite: false,
          tags: [],
        };

        await addTrack(track);
        addedCount++;
      }

      await loadTracks();
      setErrorMsg(null);
    } catch (error) {
      setErrorMsg('添加文件失败: ' + String(error));
    }
  };

  const startRename = (track: BgmTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(track.id);
    setEditName(track.name);
  };

  const confirmRename = async () => {
    if (editingId && editName.trim()) {
      try {
        await renameTrack(editingId, editName.trim());
        await loadTracks();
      } catch (error) {
        setErrorMsg('重命名失败: ' + String(error));
      }
    }
    setEditingId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      confirmRename();
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const handleToggleFavorite = async (trackId: string) => {
    try {
      await toggleFavorite(trackId);
      await loadTracks();
    } catch (error) {
      setErrorMsg('收藏失败: ' + String(error));
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    try {
      await deleteTrack(trackId);
      await loadTracks();
    } catch (error) {
      setErrorMsg('删除失败: ' + String(error));
    }
  };

  const handlePlayTrack = async (track: BgmTrack) => {
    try {
      if (onPlaySpecific) {
        await onPlaySpecific(track.id);
      }
    } catch (error) {
      setErrorMsg('播放失败: ' + String(error));
    }
  };

  const filteredTracks = tracks.filter(t => t.category === activeTab);

  return (
    <div className="card-container p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <svg className="w-5 h-5" style={{ color: 'var(--primary-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <div>
            <h2 
              className="text-xl font-bold"
              style={{ color: 'var(--foreground)' }}
            >
              BGM 曲库
            </h2>
            <span 
              className="text-sm"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {tracks.length} 首音乐
            </span>
          </div>
        </div>
        <AnimatedLayerButton
          onClick={handleAddFiles}
          className="w-auto"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          添加音乐
        </AnimatedLayerButton>
      </div>

      {errorMsg && (
        <div 
          className="mb-5 p-4 rounded-lg text-sm flex items-center justify-between"
          style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--destructive)'
          }}
        >
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-3 hover:opacity-80 transition-opacity">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setActiveTab('victory')}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2"
          style={
            activeTab === 'victory'
              ? { backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }
              : { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }
          }
        >
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>V</span>
          胜利BGM
        </button>
        <button
          onClick={() => setActiveTab('defeat')}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2"
          style={
            activeTab === 'defeat'
              ? { backgroundColor: '#ef4444', color: 'white' }
              : { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }
          }
        >
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>D</span>
          失败BGM
        </button>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
        {filteredTracks.length === 0 ? (
          <div className="text-center py-14">
            <div 
              className="w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--muted)' }}
            >
              <svg className="w-8 h-8" style={{ color: 'var(--muted-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <div 
              className="text-base mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              暂无音乐
            </div>
            <div 
              className="text-sm"
              style={{ color: 'var(--muted-foreground)' }}
            >
              点击上方"添加音乐"选择本地音频文件
            </div>
          </div>
        ) : (
          filteredTracks.map((track, index) => (
            <div
              key={track.id}
              className="group flex items-center justify-between p-3 rounded-lg transition-all duration-200 cursor-pointer"
              style={{ backgroundColor: index % 2 === 0 ? 'var(--muted)' : 'transparent' }}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div 
                  className="w-6 text-center text-xs font-medium"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {index + 1}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(track.id);
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200"
                  style={{ 
                    backgroundColor: track.favorite ? 'rgba(52, 168, 90, 0.15)' : 'transparent',
                    color: track.favorite ? 'var(--primary)' : 'var(--muted-foreground)'
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill={track.favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
                
                <div 
                  className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center"
                  style={{
                    backgroundColor: track.category === 'defeat' ? '#ef4444' : 'var(--primary)'
                  }}
                >
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
                    {track.name.charAt(0)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  {editingId === track.id ? (
                    <input
                      ref={editInputRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={confirmRename}
                      onKeyDown={handleRenameKeyDown}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border outline-none transition-all"
                      style={{ 
                        backgroundColor: 'var(--input-bg)',
                        color: 'var(--text-color)',
                        border: '1px solid var(--border)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="min-w-0">
                      <div
                        className="text-sm font-medium truncate"
                        style={{ color: 'var(--foreground)' }}
                        onClick={(e) => startRename(track, e)}
                        title="点击重命名"
                      >
                        {track.name}
                      </div>
                      <div 
                        className="text-xs truncate"
                        style={{ color: 'var(--muted-foreground)' }}
                      >
                        {track.path}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayTrack(track);
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:scale-110 transition-transform"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  <svg className="w-4 h-4 ml-0.5" style={{ color: 'var(--primary-foreground)' }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTrack(track.id);
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:scale-110 transition-all"
                  style={{ backgroundColor: 'var(--muted)' }}
                >
                  <svg className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
