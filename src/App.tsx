import { useState, useEffect } from 'react';
import { useAudio } from './hooks/useAudio';
import { useHotkey } from './hooks/useHotkey';
import { Sidebar } from './components/Sidebar';
import { QuickPlay } from './components/QuickPlay';
import { AIRecommend } from './components/AIRecommend';
import { HotkeyBinder } from './components/HotkeyBinder';
import { StatusPanel } from './components/StatusPanel';
import { PlayerBar } from './components/PlayerBar';
import { Header } from './components/Header';
import { BgmLibrary } from './components/BgmLibrary';
import { Settings } from './components/Settings';
import { AutoClipper } from './components/AutoClipper';
import { DouyinExtractor } from './components/DouyinExtractor';
import { ManualClipper } from './components/ManualClipper';
import OnlineLibrary from './components/OnlineLibrary';
import { LoginModal } from './components/LoginModal';
import { AdminPanel } from './pages/AdminPanel';
import VirtualAudioGuide from './components/VirtualAudioGuide';
import { Profile } from './components/Profile';
import { AccountSettings } from './components/AccountSettings';
import { AuthStorage, initStorage } from './utils/storage';
import { clearToken, getCurrentUser } from './lib/auth-api';
import type { User } from './types';

type Page = 'home' | 'library' | 'ai' | 'hotkey' | 'settings' | 'tools' | 'online' | 'profile' | 'account';
type AppView = 'main' | 'admin-panel';

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

const toUserInfo = (user: User): UserInfo => ({
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

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('main');
  const [isInitializing, setIsInitializing] = useState(true);
  const { nowPlaying, isPlaying, isLoading, outputVolume, lastHotkey, error, play, pause, stop, resume, playSpecific, setOutputVolume } = useAudio();
  const { hotkeys, updateHotkey } = useHotkey();

  useEffect(() => {
    initApp();
  }, []);

  useEffect(() => {
    const handleAdminShortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a' && user?.role === 'admin') {
        event.preventDefault();
        setCurrentView((view) => view === 'admin-panel' ? 'main' : 'admin-panel');
      }
    };

    window.addEventListener('keydown', handleAdminShortcut);
    return () => window.removeEventListener('keydown', handleAdminShortcut);
  }, [user?.role]);

  const initApp = async () => {
    try {
      await initStorage();
      await checkAuth();
    } catch (error) {
      console.error('应用初始化失败:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const checkAuth = async () => {
    const token = await AuthStorage.getToken();
    if (!token) return;

    try {
      const userInfo = toUserInfo(await getCurrentUser());
      setUser(userInfo);
      await AuthStorage.setUserInfo(userInfo);
    } catch {
      clearToken();
      await AuthStorage.clear();
    }
  };

  const handleLogin = async (userInfo: UserInfo) => {
    setUser(userInfo);
    await AuthStorage.setUserInfo(userInfo);
  };

  const handleLogout = async () => {
    clearToken();
    await AuthStorage.clear();
    setUser(null);
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'home':
        return (
          <div className="space-y-[18px]">
            <div className="grid grid-cols-[2.2fr_1.2fr] gap-[18px]">
              <QuickPlay onPlay={play} isLoading={isLoading} error={error} />
              <StatusPanel onStop={stop} />
            </div>
          </div>
        );
      case 'library':
        return <BgmLibrary onPlaySpecific={playSpecific} />;
      case 'ai':
        return <AIRecommend />;
      case 'hotkey':
        return <HotkeyBinder hotkeys={hotkeys} onUpdate={updateHotkey} />;
      case 'settings':
        return <Settings />;
      case 'tools':
        return (
          <div className="space-y-[18px]">
            <DouyinExtractor />
            <AutoClipper />
            <ManualClipper />
          </div>
        );
      case 'online':
        return <OnlineLibrary />;
      case 'profile':
        return <Profile 
          user={user ? {
            id: user.id,
            email: user.email,
            username: user.username,
            avatar: user.avatar,
            role: user.role,
            qqConnected: user.qqConnected,
            qqNickname: user.qqNickname,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          } : null}
          onNavigateSettings={() => setCurrentPage('account')}
        />;
      case 'account':
        return user ? <AccountSettings
          onBack={() => setCurrentPage('profile')}
          user={{
            _id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            avatar: user.avatar,
            qqConnected: user.qqConnected,
            qqNickname: user.qqNickname,
          }}
          onUserUpdated={(updatedUser) => setUser(toUserInfo(updatedUser))}
        /> : <Profile user={null} onNavigateSettings={() => setCurrentPage('profile')} />;
      default:
        return null;
    }
  };

  const handleAdminLogout = () => {
    setCurrentView('main');
  };

  if (isInitializing) {
    return (
      <div 
        className="h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--background)' }}
      >
        <div className="flex flex-col items-center">
          <div 
            className="w-14 h-14 border-4 border-t-4 rounded-full animate-spin mb-5"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }}
          ></div>
          <p style={{ color: 'var(--muted-foreground)' }}>正在初始化...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'admin-panel') {
    return <AdminPanel onLogout={handleAdminLogout} />;
  }

  return (
    <div 
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          isPlaying={isPlaying}
          track={nowPlaying}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Header
            user={user}
            onLoginClick={() => setIsLoginModalOpen(true)}
            onLogout={handleLogout}
          />
          <div className="mt-6 animate-fade-in">
            {renderContent()}
          </div>
        </main>
      </div>
      <PlayerBar
        isPlaying={isPlaying}
        volume={outputVolume}
        track={nowPlaying}
        lastHotkey={lastHotkey}
        onPause={pause}
        onResume={resume}
        onPlay={play}
        onVolumeChange={setOutputVolume}
      />
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
      />
      <VirtualAudioGuide />
    </div>
  );
}

export default App;
