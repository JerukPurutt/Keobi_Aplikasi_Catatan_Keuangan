// Repository for category database operations
import getDatabase from '../db/database';
import { Category, CategoryType } from '../types';
import { generateId } from '../utils/helpers';
import { useSettingsStore } from '../store/useSettingsStore';

export const categoryRepository = {
  async getAll(): Promise<Category[]> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return [];

    return await db.getAllAsync<Category>(
      'SELECT * FROM categories WHERE user_email = ? ORDER BY is_default DESC, name ASC',
      [email]
    );
  },

  async getByType(type: CategoryType | 'income' | 'expense'): Promise<Category[]> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return [];

    return await db.getAllAsync<Category>(
      `SELECT * FROM categories WHERE user_email = ? AND (type = ? OR type = 'both') ORDER BY is_default DESC, name ASC`,
      [email, type]
    );
  },

  async getById(id: string): Promise<Category | null> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return null;

    return await db.getFirstAsync<Category>(
      'SELECT * FROM categories WHERE id = ? AND user_email = ?',
      [id, email]
    );
  },

  async create(data: Omit<Category, 'id' | 'created_at' | 'is_default'>): Promise<Category> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) throw new Error('User not logged in');

    const now = Date.now();
    const id = generateId('cat');
    await db.runAsync(
      `INSERT INTO categories (id, user_email, name, color, icon, type, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [id, email, data.name, data.color, data.icon, data.type, now]
    );
    return { id, ...data, is_default: 0, created_at: now };
  },

  async update(id: string, data: Partial<Omit<Category, 'id' | 'created_at' | 'is_default'>>): Promise<void> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return;

    const keys = Object.keys(data);
    if (keys.length === 0) return;
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (data as any)[k]);
    await db.runAsync(
      `UPDATE categories SET ${setClause} WHERE id = ? AND user_email = ?`,
      [...values, id, email]
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return;

    // Don't delete if it's a default category
    await db.runAsync('DELETE FROM categories WHERE id = ? AND user_email = ? AND is_default = 0', [id, email]);
  },
};
