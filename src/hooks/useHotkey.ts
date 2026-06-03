import { useState, useEffect } from 'react';
import { getConfig, saveConfig, updateHotkeys } from '../lib/tauri-api';
import type { HotkeyConfig } from '../types';

export function useHotkey() {
  const [hotkeys, setHotkeys] = useState<HotkeyConfig>({
    victory_key: 'Numpad1',
    defeat_key: 'Numpad2',
    stop_key: 'Numpad0',
  });

  useEffect(() => {
    getConfig().then(config => {
      setHotkeys(config.hotkeys);
    });
  }, []);

  const updateHotkey = async (key: keyof HotkeyConfig, value: string) => {
    const newHotkeys = { ...hotkeys, [key]: value };
    setHotkeys(newHotkeys);
    
    try {
      const config = await getConfig();
      config.hotkeys = newHotkeys;
      await saveConfig(config);
      await updateHotkeys();
    } catch (error) {
      console.error('保存热键配置失败:', error);
    }
  };

  return {
    hotkeys,
    updateHotkey,
  };
}
