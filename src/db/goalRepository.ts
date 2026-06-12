// Repository for saving goals (Target Tabungan) in Keobi
import getDatabase from './database';
import { SavingGoal } from '../types';

export const goalRepository = {
  async getAll(userEmail: string): Promise<SavingGoal[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SavingGoal>(
      'SELECT * FROM goals WHERE user_email = ? ORDER BY created_at DESC',
      [userEmail]
    );
    return rows;
  },

  async getById(id: string): Promise<SavingGoal | null> {
    const db = await getDatabase();
    return await db.getFirstAsync<SavingGoal>(
      'SELECT * FROM goals WHERE id = ?',
      [id]
    ) ?? null;
  },

  async create(goal: Omit<SavingGoal, 'saved_amount'>): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO goals (id, user_email, title, icon, color, target_amount, saved_amount, deadline, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [
        goal.id,
        goal.user_email,
        goal.title,
        goal.icon,
        goal.color,
        goal.target_amount,
        goal.deadline ?? null,
        goal.created_at,
        goal.updated_at,
      ]
    );
  },

  async update(id: string, fields: Partial<Pick<SavingGoal, 'title' | 'icon' | 'color' | 'target_amount' | 'deadline'>>): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();
    const setClauses: string[] = [];
    const values: any[] = [];

    if (fields.title !== undefined) { setClauses.push('title = ?'); values.push(fields.title); }
    if (fields.icon !== undefined) { setClauses.push('icon = ?'); values.push(fields.icon); }
    if (fields.color !== undefined) { setClauses.push('color = ?'); values.push(fields.color); }
    if (fields.target_amount !== undefined) { setClauses.push('target_amount = ?'); values.push(fields.target_amount); }
    if (fields.deadline !== undefined) { setClauses.push('deadline = ?'); values.push(fields.deadline); }

    setClauses.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await db.runAsync(
      `UPDATE goals SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );
  },

  /**
   * Add savings to goal AND deduct from wallet balance.
   * Returns false if wallet has insufficient balance.
   */
  async addSavings(goalId: string, walletId: string, amount: number): Promise<boolean> {
    const db = await getDatabase();
    const now = Date.now();

    // Check wallet balance
    const wallet = await db.getFirstAsync<{ balance: number }>(
      'SELECT balance FROM wallets WHERE id = ?',
      [walletId]
    );
    if (!wallet || wallet.balance < amount) return false;

    await db.withTransactionAsync(async () => {
      // Deduct from wallet
      await db.runAsync(
        'UPDATE wallets SET balance = balance - ?, updated_at = ? WHERE id = ?',
        [amount, now, walletId]
      );
      // Add to goal saved_amount
      await db.runAsync(
        'UPDATE goals SET saved_amount = saved_amount + ?, updated_at = ? WHERE id = ?',
        [amount, now, goalId]
      );
    });
    return true;
  },

  /**
   * Withdraw savings from goal AND return to wallet balance.
   * Returns false if goal saved_amount < amount.
   */
  async withdrawSavings(goalId: string, walletId: string, amount: number): Promise<boolean> {
    const db = await getDatabase();
    const now = Date.now();

    const goal = await db.getFirstAsync<{ saved_amount: number }>(
      'SELECT saved_amount FROM goals WHERE id = ?',
      [goalId]
    );
    if (!goal || goal.saved_amount < amount) return false;

    await db.withTransactionAsync(async () => {
      // Return to wallet
      await db.runAsync(
        'UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE id = ?',
        [amount, now, walletId]
      );
      // Deduct from goal
      await db.runAsync(
        'UPDATE goals SET saved_amount = saved_amount - ?, updated_at = ? WHERE id = ?',
        [amount, now, goalId]
      );
    });
    return true;
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM goals WHERE id = ?', [id]);
  },
};
