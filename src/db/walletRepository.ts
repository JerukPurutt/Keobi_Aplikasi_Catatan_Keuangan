// Repository for wallet database operations
import getDatabase from '../db/database';
import { Wallet } from '../types';
import { generateId } from '../utils/helpers';
import { useSettingsStore } from '../store/useSettingsStore';

export const walletRepository = {
  async getAll(): Promise<Wallet[]> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return [];
    
    const result = await db.getAllAsync<Wallet>(
      'SELECT * FROM wallets WHERE user_email = ? ORDER BY created_at ASC',
      [email]
    );
    return result || [];
  },

  async getById(id: string): Promise<Wallet | null> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return null;

    return await db.getFirstAsync<Wallet>(
      'SELECT * FROM wallets WHERE id = ? AND user_email = ?',
      [id, email]
    );
  },

  async getTotalBalance(): Promise<number> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return 0;

    const result = await db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE user_email = ?',
      [email]
    );
    return result?.total || 0;
  },

  async create(data: Omit<Wallet, 'id' | 'created_at' | 'updated_at'>): Promise<Wallet> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) throw new Error('User not logged in');

    const now = Date.now();
    const id = generateId('wallet');
    await db.runAsync(
      `INSERT INTO wallets (id, user_email, name, icon, color, balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, email, data.name, data.icon, data.color, data.balance, now, now]
    );
    return { id, ...data, created_at: now, updated_at: now };
  },

  async update(id: string, data: Partial<Omit<Wallet, 'id' | 'created_at'>>): Promise<void> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return;

    const now = Date.now();
    const keys = Object.keys(data).filter(k => k !== 'updated_at');
    if (keys.length === 0) return;
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (data as any)[k]);
    await db.runAsync(
      `UPDATE wallets SET ${setClause}, updated_at = ? WHERE id = ? AND user_email = ?`,
      [...values, now, id, email]
    );
  },

  async updateBalance(id: string, delta: number): Promise<void> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return;

    await db.runAsync(
      `UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE id = ? AND user_email = ?`,
      [delta, Date.now(), id, email]
    );
  },

  async setBalance(id: string, amount: number): Promise<void> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return;

    await db.runAsync(
      `UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ? AND user_email = ?`,
      [amount, Date.now(), id, email]
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return;

    await db.runAsync('DELETE FROM wallets WHERE id = ? AND user_email = ?', [id, email]);
  },
};
