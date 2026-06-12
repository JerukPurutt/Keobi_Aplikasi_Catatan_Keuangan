// Repository for app settings
import getDatabase from '../db/database';
import { Settings } from '../types';

export const settingsRepository = {
  async get(key: keyof Settings | string): Promise<string | null> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?', [key]
    );
    return result?.value ?? null;
  },

  async set(key: keyof Settings | string, value: string): Promise<void> {
    const db = await getDatabase();
    
    // Check if user is logged in
    const email = await this.get('login_email');
    const userSpecificKeys = ['profile_name', 'pin_enabled', 'pin_hash', 'biometric_enabled', 'login_password_hash'];
    
    if (userSpecificKeys.includes(key) && email) {
      let colName = key;
      if (key === 'login_password_hash') colName = 'password_hash';
      
      const val = key === 'pin_enabled' || key === 'biometric_enabled' ? (value === 'true' ? 1 : 0) : value;
      
      await db.runAsync(
        `UPDATE users SET ${colName} = ? WHERE email = ?`,
        [val, email]
      );
      return;
    }
    
    await db.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  },

  async getAll(): Promise<Record<string, string>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT * FROM settings');
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  },

  async getTyped(): Promise<Settings> {
    const all = await this.getAll();
    const email = all.login_email || '';
    
    let userSettings: Partial<Settings> = {};
    if (email) {
      const db = await getDatabase();
      const user = await db.getFirstAsync<{
        profile_name: string;
        password_hash: string;
        pin_hash: string;
        pin_enabled: number;
        biometric_enabled: number;
      }>('SELECT * FROM users WHERE email = ?', [email]);
      
      if (user) {
        userSettings = {
          profile_name: user.profile_name,
          login_password_hash: user.password_hash,
          pin_hash: user.pin_hash || '',
          pin_enabled: user.pin_enabled === 1,
          biometric_enabled: user.biometric_enabled === 1,
        };
      }
    }
    
    return {
      dark_mode: all.dark_mode === 'true',
      profile_name: userSettings.profile_name || all.profile_name || 'Pengguna',
      pin_enabled: userSettings.pin_enabled ?? all.pin_enabled === 'true',
      pin_hash: userSettings.pin_hash ?? (all.pin_hash || ''),
      biometric_enabled: userSettings.biometric_enabled ?? all.biometric_enabled === 'true',
      primary_color: all.primary_color || '#1A6FE8',
      onboarded: all.onboarded === 'true',
      currency: all.currency || 'IDR',
      session_active: all.session_active === 'true',
      login_email: email,
      login_password_hash: userSettings.login_password_hash || all.login_password_hash || '',
    };
  },
};
