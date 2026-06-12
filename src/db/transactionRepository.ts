// Repository for transaction database operations
import getDatabase from '../db/database';
import { Transaction, TransactionType, CategorySummary } from '../types';
import { generateId } from '../utils/helpers';
import { useSettingsStore } from '../store/useSettingsStore';

export const transactionRepository = {
  async getAll(limit = 50, offset = 0): Promise<Transaction[]> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return [];

    return await db.getAllAsync<Transaction>(`
      SELECT 
        t.*,
        w.name as wallet_name, w.color as wallet_color, w.icon as wallet_icon,
        c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_email = ?
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ? OFFSET ?
    `, [email, limit, offset]);
  },

  async getByDateRange(startDate: number, endDate: number, type?: TransactionType): Promise<Transaction[]> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return [];

    const typeFilter = type ? `AND t.type = '${type}'` : '';
    return await db.getAllAsync<Transaction>(`
      SELECT 
        t.*,
        w.name as wallet_name, w.color as wallet_color, w.icon as wallet_icon,
        c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_email = ? AND t.date BETWEEN ? AND ? ${typeFilter}
      ORDER BY t.date DESC, t.created_at DESC
    `, [email, startDate, endDate]);
  },

  async getByWallet(walletId: string, limit = 30): Promise<Transaction[]> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return [];

    return await db.getAllAsync<Transaction>(`
      SELECT 
        t.*,
        w.name as wallet_name, w.color as wallet_color, w.icon as wallet_icon,
        c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_email = ? AND t.wallet_id = ?
      ORDER BY t.date DESC LIMIT ?
    `, [email, walletId, limit]);
  },

  async getSummaryForPeriod(startDate: number, endDate: number): Promise<{ income: number; expense: number }> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return { income: 0, expense: 0 };

    const result = await db.getFirstAsync<{ income: number; expense: number }>(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
      FROM transactions
      WHERE user_email = ? AND date BETWEEN ? AND ?
    `, [email, startDate, endDate]);
    return result || { income: 0, expense: 0 };
  },

  async getDailySummaries(startDate: number, endDate: number): Promise<Array<{ date_label: string; income: number; expense: number }>> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return [];

    return await db.getAllAsync(`
      SELECT 
        strftime('%Y-%m-%d', date / 1000, 'unixepoch', 'localtime') as date_label,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
      FROM transactions
      WHERE user_email = ? AND date BETWEEN ? AND ?
      GROUP BY date_label
      ORDER BY date_label ASC
    `, [email, startDate, endDate]);
  },

  async getCategoryBreakdown(startDate: number, endDate: number, type: 'income' | 'expense'): Promise<CategorySummary[]> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return [];

    const rows = await db.getAllAsync<any>(`
      SELECT 
        t.category_id,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon,
        SUM(t.amount) as total,
        COUNT(t.id) as count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_email = ? AND t.type = ? AND t.date BETWEEN ? AND ?
      GROUP BY t.category_id
      ORDER BY total DESC
    `, [email, type, startDate, endDate]);

    const grandTotal = rows.reduce((sum: number, r: any) => sum + r.total, 0);
    return rows.map((row: any) => ({
      ...row,
      percentage: grandTotal > 0 ? (row.total / grandTotal) * 100 : 0,
    }));
  },

  async create(data: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) throw new Error('User not logged in');

    const now = Date.now();
    const id = generateId('txn');
    await db.runAsync(
      `INSERT INTO transactions (id, user_email, wallet_id, category_id, type, amount, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, email, data.wallet_id, data.category_id || null, data.type, data.amount, data.note || '', data.date, now]
    );
    return { id, ...data, created_at: now };
  },

  async delete(id: string, walletId: string, type: TransactionType, amount: number): Promise<void> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return;

    // Reverse the balance effect
    const balanceDelta = type === 'income' ? -amount : amount;
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM transactions WHERE id = ? AND user_email = ?', [id, email]);
      await db.runAsync(
        'UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE id = ? AND user_email = ?',
        [balanceDelta, Date.now(), walletId, email]
      );
    });
  },

  async update(id: string, oldTxn: Transaction, newTxn: Omit<Transaction, 'id' | 'created_at'>): Promise<void> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return;
    
    const now = Date.now();
    
    // Reverse old wallet effect
    const oldBalanceDelta = oldTxn.type === 'income' ? -oldTxn.amount : oldTxn.amount;
    // Apply new wallet effect
    const newBalanceDelta = newTxn.type === 'income' ? newTxn.amount : -newTxn.amount;
    
    await db.withTransactionAsync(async () => {
      // 1. Update transaction record
      await db.runAsync(
        `UPDATE transactions 
         SET wallet_id = ?, category_id = ?, type = ?, amount = ?, note = ?, date = ? 
         WHERE id = ? AND user_email = ?`,
        [newTxn.wallet_id, newTxn.category_id || null, newTxn.type, newTxn.amount, newTxn.note || '', newTxn.date, id, email]
      );
      
      // 2. Adjust old wallet balance (reverse old effect)
      await db.runAsync(
        'UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE id = ? AND user_email = ?',
        [oldBalanceDelta, now, oldTxn.wallet_id, email]
      );
      
      // 3. Adjust new wallet balance (apply new effect)
      await db.runAsync(
        'UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE id = ? AND user_email = ?',
        [newBalanceDelta, now, newTxn.wallet_id, email]
      );
    });
  },

  async getCount(): Promise<number> {
    const db = await getDatabase();
    const email = useSettingsStore.getState().login_email;
    if (!email) return 0;

    const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM transactions WHERE user_email = ?', [email]);
    return result?.count || 0;
  },
};
