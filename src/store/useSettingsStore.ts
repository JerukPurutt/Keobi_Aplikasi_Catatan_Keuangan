// Zustand store for app settings and theme
import { create } from 'zustand';
import { Settings } from '../types';
import { settingsRepository } from '../db/settingsRepository';

interface SettingsState extends Settings {
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  dark_mode: false,
  profile_name: 'Pengguna',
  pin_enabled: false,
  pin_hash: '',
  biometric_enabled: false,
  primary_color: '#1A6FE8',
  onboarded: false,
  currency: 'IDR',
  session_active: false,
  login_email: '',
  login_password_hash: '',
  isLoaded: false,

  loadSettings: async () => {
    try {
      const settings = await settingsRepository.getTyped();
      set({ ...settings, isLoaded: true });
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoaded: true });
    }
  },

  setSetting: async (key, value) => {
    set({ [key]: value } as any);
    await settingsRepository.set(key, String(value));
  },

  toggleDarkMode: async () => {
    const newValue = !get().dark_mode;
    set({ dark_mode: newValue });
    await settingsRepository.set('dark_mode', String(newValue));
  },
}));
