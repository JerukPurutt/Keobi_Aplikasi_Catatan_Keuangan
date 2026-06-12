// TypeScript types for Keobi
export type TransactionType = 'income' | 'expense' | 'transfer';
export type CategoryType = 'income' | 'expense' | 'both';
export type ThemeMode = 'light' | 'dark';
export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export interface Wallet {
  id: string;
  name: string;
  icon: string;
  color: string;
  balance: number;
  created_at: number;
  updated_at: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: CategoryType;
  is_default: number;
  created_at: number;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  note: string;
  date: number;
  created_at: number;
  // Joined fields
  wallet_name?: string;
  wallet_color?: string;
  wallet_icon?: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
}

export interface Settings {
  dark_mode: boolean;
  profile_name: string;
  pin_enabled: boolean;
  pin_hash: string;
  biometric_enabled: boolean;
  primary_color: string;
  onboarded: boolean;
  currency: string;
  session_active: boolean;
  login_email: string;
  login_password_hash: string;
}

export interface DailySummary {
  date: string;
  income: number;
  expense: number;
}

export interface CategorySummary {
  category_id: string;
  category_name: string;
  category_color: string;
  category_icon: string;
  total: number;
  percentage: number;
  count: number;
}

export interface AnalyticsInsight {
  type: 'warning' | 'success' | 'info' | 'tip';
  title: string;
  description: string;
  icon: string;
}

export interface SavingGoal {
  id: string;
  user_email: string;
  title: string;
  icon: string;
  color: string;
  target_amount: number;
  saved_amount: number;
  deadline: number | null; // timestamp ms, null = no deadline
  created_at: number;
  updated_at: number;
}
