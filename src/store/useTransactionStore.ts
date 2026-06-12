// Zustand store for transactions
import { create } from 'zustand';
import { Transaction, TransactionType } from '../types';
import { transactionRepository } from '../db/transactionRepository';
import { walletRepository } from '../db/walletRepository';
import getDatabase from '../db/database';
import { useWalletStore } from './useWalletStore';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  hasMore: boolean;
  currentMonthIncome: number;
  currentMonthExpense: number;
  loadTransactions: (reset?: boolean) => Promise<void>;
  loadMonthSummary: () => Promise<void>;
  addTransaction: (data: Omit<Transaction, 'id' | 'created_at'>) => Promise<Transaction>;
  deleteTransaction: (id: string, walletId: string, type: TransactionType, amount: number) => Promise<void>;
  updateTransaction: (id: string, oldTxn: Transaction, newTxn: Omit<Transaction, 'id' | 'created_at'>) => Promise<void>;
}

const PAGE_SIZE = 30;

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,
  hasMore: true,
  currentMonthIncome: 0,
  currentMonthExpense: 0,

  loadTransactions: async (reset = false) => {
    const { transactions, isLoading, hasMore } = get();
    if (isLoading || (!reset && !hasMore)) return;

    set({ isLoading: true });
    try {
      const offset = reset ? 0 : transactions.length;
      const newTxns = await transactionRepository.getAll(PAGE_SIZE, offset);
      set(state => ({
        transactions: reset ? newTxns : [...state.transactions, ...newTxns],
        hasMore: newTxns.length === PAGE_SIZE,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to load transactions:', error);
      set({ isLoading: false });
    }
  },

  loadMonthSummary: async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
    const summary = await transactionRepository.getSummaryForPeriod(startOfMonth, endOfMonth);
    set({ currentMonthIncome: summary.income, currentMonthExpense: summary.expense });
  },

  addTransaction: async (data) => {
    const db = await getDatabase();
    // Use a transaction to ensure atomicity
    let newTxn: Transaction | null = null;
    const balanceDelta = data.type === 'income' ? data.amount : -data.amount;

    await db.withTransactionAsync(async () => {
      newTxn = await transactionRepository.create(data);
      await walletRepository.updateBalance(data.wallet_id, balanceDelta);
    });

    if (newTxn) {
      // Re-load to get joined fields
      const allTxns = await transactionRepository.getAll(get().transactions.length + 1, 0);
      const freshTxn = allTxns.find((t: Transaction) => t.id === (newTxn as Transaction).id);

      set(state => ({
        transactions: freshTxn
          ? [freshTxn, ...state.transactions]
          : [newTxn as Transaction, ...state.transactions],
        currentMonthIncome: data.type === 'income'
          ? state.currentMonthIncome + data.amount
          : state.currentMonthIncome,
        currentMonthExpense: data.type === 'expense'
          ? state.currentMonthExpense + data.amount
          : state.currentMonthExpense,
      }));
      // Sync wallets store
      await useWalletStore.getState().loadWallets();
    }

    return newTxn!;
  },

  deleteTransaction: async (id, walletId, type, amount) => {
    await transactionRepository.delete(id, walletId, type, amount);
    set(state => ({
      transactions: state.transactions.filter(t => t.id !== id),
      currentMonthIncome: type === 'income'
        ? state.currentMonthIncome - amount
        : state.currentMonthIncome,
      currentMonthExpense: type === 'expense'
        ? state.currentMonthExpense - amount
        : state.currentMonthExpense,
    }));
    // Sync wallets store
    await useWalletStore.getState().loadWallets();
  },

  updateTransaction: async (id, oldTxn, newTxn) => {
    await transactionRepository.update(id, oldTxn, newTxn);
    const store = get();
    await store.loadTransactions(true);
    await store.loadMonthSummary();
    // Sync wallets store
    await useWalletStore.getState().loadWallets();
  },
}));
