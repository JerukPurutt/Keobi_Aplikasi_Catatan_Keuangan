// Database layer: SQLite initialization and migrations for Keobi
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('keobi.db');
  await initDatabase(db);
  return db;
};

const initDatabase = async (database: SQLite.SQLiteDatabase) => {
  // Check if migration is needed (column user_email missing in wallets table)
  try {
    const tableInfo = await database.getAllAsync<{ name: string }>(
      "PRAGMA table_info(wallets)"
    );
    const hasUserEmail = tableInfo.some(col => col.name === 'user_email');
    if (!hasUserEmail && tableInfo.length > 0) {
      // Drop old schema tables to prevent foreign key issues and recreate
      await database.execAsync(`
        DROP TABLE IF EXISTS transactions;
        DROP TABLE IF EXISTS categories;
        DROP TABLE IF EXISTS wallets;
        DROP TABLE IF EXISTS settings;
        DROP TABLE IF EXISTS users;
      `);
    }
  } catch (err) {
    console.error('Error checking schema migration:', err);
  }

  // Migration: add goals table if missing
  try {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY NOT NULL,
        user_email TEXT NOT NULL,
        title TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT 'trophy',
        color TEXT NOT NULL DEFAULT '#1A6FE8',
        target_amount REAL NOT NULL DEFAULT 0,
        saved_amount REAL NOT NULL DEFAULT 0,
        deadline INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_email);
    `);
  } catch (err) {
    console.error('Error creating goals table:', err);
  }

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY NOT NULL,
      password_hash TEXT NOT NULL,
      profile_name TEXT NOT NULL,
      pin_hash TEXT DEFAULT '',
      pin_enabled INTEGER DEFAULT 0,
      biometric_enabled INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY NOT NULL,
      user_email TEXT NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'wallet',
      color TEXT NOT NULL DEFAULT '#1A6FE8',
      balance REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      user_email TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#1A6FE8',
      icon TEXT NOT NULL DEFAULT 'pricetag',
      type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'both')),
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      user_email TEXT NOT NULL,
      wallet_id TEXT NOT NULL,
      category_id TEXT,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
      amount REAL NOT NULL,
      note TEXT DEFAULT '',
      date INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE,
      FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_email, date DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
  `);

  await seedDefaultData(database);
};

const seedDefaultData = async (database: SQLite.SQLiteDatabase) => {
  const settingsCount = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM settings'
  );

  if (settingsCount && settingsCount.count > 0) return;

  // Insert default settings
  await database.runAsync(
    `INSERT OR IGNORE INTO settings (key, value) VALUES 
      ('dark_mode', 'false'),
      ('primary_color', '#1A6FE8'),
      ('onboarded', 'false'),
      ('currency', 'IDR'),
      ('session_active', 'false'),
      ('login_email', '')`
  );
};

export const seedDefaultDataForUser = async (database: SQLite.SQLiteDatabase, email: string): Promise<void> => {
  const now = Date.now();

  // Default categories
  const defaultCategories = [
    { id: `cat_gaji_${email}`, name: 'Gaji', color: '#22C55E', icon: 'briefcase', type: 'income' },
    { id: `cat_freelance_${email}`, name: 'Freelance', color: '#3B82F6', icon: 'laptop', type: 'income' },
    { id: `cat_investasi_${email}`, name: 'Investasi', color: '#8B5CF6', icon: 'trending-up', type: 'income' },
    { id: `cat_bonus_${email}`, name: 'Bonus', color: '#F59E0B', icon: 'gift', type: 'income' },
    { id: `cat_makan_${email}`, name: 'Makan & Minum', color: '#EF4444', icon: 'restaurant', type: 'expense' },
    { id: `cat_transport_${email}`, name: 'Transportasi', color: '#F97316', icon: 'car', type: 'expense' },
    { id: `cat_belanja_${email}`, name: 'Belanja', color: '#EC4899', icon: 'bag', type: 'expense' },
    { id: `cat_tagihan_${email}`, name: 'Tagihan', color: '#6366F1', icon: 'receipt', type: 'expense' },
    { id: `cat_kesehatan_${email}`, name: 'Kesehatan', color: '#14B8A6', icon: 'medical', type: 'expense' },
    { id: `cat_hiburan_${email}`, name: 'Hiburan', color: '#A855F7', icon: 'game-controller', type: 'expense' },
    { id: `cat_skincare_${email}`, name: 'Skincare', color: '#F472B6', icon: 'sparkles', type: 'expense' },
    { id: `cat_jajan_${email}`, name: 'Jajan', color: '#FBBF24', icon: 'fast-food', type: 'expense' },
    { id: `cat_pendidikan_${email}`, name: 'Pendidikan', color: '#2563EB', icon: 'school', type: 'expense' },
    { id: `cat_lainnya_${email}`, name: 'Lainnya', color: '#6B7280', icon: 'ellipsis-horizontal', type: 'both' },
  ];

  for (const cat of defaultCategories) {
    await database.runAsync(
      `INSERT OR IGNORE INTO categories (id, user_email, name, color, icon, type, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [cat.id, email, cat.name, cat.color, cat.icon, cat.type, now]
    );
  }

  // Default wallet
  await database.runAsync(
    `INSERT OR IGNORE INTO wallets (id, user_email, name, icon, color, balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [`wallet_tunai_${email}`, email, 'Tunai', 'cash', '#22C55E', 0, now, now]
  );
};

export const resetDatabaseForNewUser = async (): Promise<void> => {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM transactions');
    await db.runAsync('DELETE FROM wallets');
    await db.runAsync('DELETE FROM categories');
    await db.runAsync('DELETE FROM settings');
    await db.runAsync('DELETE FROM users');
  });
  await seedDefaultData(db);
};

export const deleteUserAccount = async (email: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM users WHERE email = ?', [email]);
};

export default getDatabase;
