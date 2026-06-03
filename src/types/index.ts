export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  deepseekApiKey?: string;
  createdAt: string;
  updatedAt: string;
  avatar?: string;
  qqConnected?: boolean;
  qqNickname?: string;
}

export interface AuthResponse {
  _id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
  deepseekApiKey?: string;
  token: string;
  avatar?: string;
  qqConnected?: boolean;
  qqNickname?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  role: 'user' | 'admin';
  qqConnected?: boolean;
  qqNickname?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BgmTrack {
  id: string;
  name: string;
  path: string;
  category: 'victory' | 'defeat';
  favorite: boolean;
  tags: string[];
}

export interface HotkeyConfig {
  victory_key: string;
  defeat_key: string;
  stop_key: string;
}

export interface AppConfig {
  listen_volume: number;
  output_volume: number;
  audio_device: string;
  virtual_audio_device: string;
  use_virtual_device: boolean;
  hotkeys: HotkeyConfig;
  tracks: BgmTrack[];
  ai_api_key: string;
  ai_api_url: string;
  ai_model: string;
}

export interface AudioDevice {
  id: string;
  name: string;
  is_virtual?: boolean;
}

export interface AIRecommendation {
  name: string;
  artist: string;
  reason: string;
  tags?: string[];
}

export interface NowPlayingState {
  track: BgmTrack | null;
  isPlaying: boolean;
  volume: number;
}
