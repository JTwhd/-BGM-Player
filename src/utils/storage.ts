const STORAGE_KEYS = {
  USER_TOKEN: 'user_token',
  USER_EMAIL: 'user_email',
  USER_INFO: 'user_info',
  APP_CONFIG: 'app_config',
  HOTKEYS: 'hotkeys',
  BGM_TRACKS: 'bgm_tracks',
  DEVICE_ID: 'device_id',
};

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`存储 ${key} 失败:`, error);
  }
}

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return null;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`读取 ${key} 失败:`, error);
    return null;
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`删除 ${key} 失败:`, error);
  }
}

export async function clearAll(): Promise<void> {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('清空存储失败:', error);
  }
}

export async function initStorage(): Promise<void> {
  console.log('✅ 存储初始化完成');
}

export const AuthStorage = {
  async getToken(): Promise<string | null> {
    const token = localStorage.getItem(STORAGE_KEYS.USER_TOKEN);
    return token || null;
  },

  async setToken(token: string): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.USER_TOKEN, token);
  },

  async getEmail(): Promise<string | null> {
    const email = localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
    return email || null;
  },

  async setEmail(email: string): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
  },

  async getUserInfo(): Promise<UserInfo | null> {
    return getItem<UserInfo>(STORAGE_KEYS.USER_INFO);
  },

  async setUserInfo(user: UserInfo): Promise<void> {
    await setItem(STORAGE_KEYS.USER_INFO, user);
  },

  async clear(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
    localStorage.removeItem('token');
    localStorage.removeItem('bgm_player_token');
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
    localStorage.removeItem(STORAGE_KEYS.USER_INFO);
  },
};

export interface UserInfo {
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

export const ConfigStorage = {
  async getConfig(): Promise<AppConfig | null> {
    return getItem<AppConfig>(STORAGE_KEYS.APP_CONFIG);
  },

  async setConfig(config: AppConfig): Promise<void> {
    await setItem(STORAGE_KEYS.APP_CONFIG, config);
  },

  async getHotkeys(): Promise<HotkeyConfig | null> {
    return getItem<HotkeyConfig>(STORAGE_KEYS.HOTKEYS);
  },

  async setHotkeys(hotkeys: HotkeyConfig): Promise<void> {
    await setItem(STORAGE_KEYS.HOTKEYS, hotkeys);
  },

  async getTracks(): Promise<BgmTrack[] | null> {
    return getItem<BgmTrack[]>(STORAGE_KEYS.BGM_TRACKS);
  },

  async setTracks(tracks: BgmTrack[]): Promise<void> {
    await setItem(STORAGE_KEYS.BGM_TRACKS, tracks);
  },
};

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

export interface HotkeyConfig {
  victory_key: string;
  defeat_key: string;
  stop_key: string;
}

export interface BgmTrack {
  id: string;
  name: string;
  path: string;
  category: 'victory' | 'defeat';
  favorite: boolean;
  tags: string[];
}

export const DeviceStorage = {
  async getDeviceId(): Promise<string> {
    let id = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!id) {
      id = 'device-' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, id);
    }
    return id;
  },
};

export { STORAGE_KEYS };
