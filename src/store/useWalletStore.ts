// Zustand store for wallets
import { create } from 'zustand';
import { Wallet } from '../types';
import { walletRepository } from '../db/walletRepository';

interface WalletState {
  wallets: Wallet[];
  totalBalance: number;
  isLoading: boolean;
  loadWallets: () => Promise<void>;
  addWallet: (data: Omit<Wallet, 'id' | 'created_at' | 'updated_at'>) => Promise<Wallet>;
  updateWallet: (id: string, data: Partial<Omit<Wallet, 'id' | 'created_at'>>) => Promise<void>;
  setWalletBalance: (id: string, amount: number) => Promise<void>;
  deleteWallet: (id: string) => Promise<void>;
  updateLocalBalance: (walletId: string, delta: number) => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: [],
  totalBalance: 0,
  isLoading: false,

  loadWallets: async () => {
    set({ isLoading: true });
    try {
      const wallets = await walletRepository.getAll();
      const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
      set({ wallets, totalBalance, isLoading: false });
    } catch (error) {
      console.error('Failed to load wallets:', error);
      set({ isLoading: false });
    }
  },

  addWallet: async (data) => {
    const wallet = await walletRepository.create(data);
    set(state => ({
      wallets: [...state.wallets, wallet],
      totalBalance: state.totalBalance + wallet.balance,
    }));
    return wallet;
  },

  updateWallet: async (id, data) => {
    await walletRepository.update(id, data);
    set(state => ({
      wallets: state.wallets.map(w => w.id === id ? { ...w, ...data, updated_at: Date.now() } : w),
    }));
  },

  setWalletBalance: async (id, amount) => {
    const wallet = get().wallets.find(w => w.id === id);
    if (!wallet) return;
    const diff = amount - wallet.balance;
    await walletRepository.setBalance(id, amount);
    set(state => ({
      wallets: state.wallets.map(w => w.id === id ? { ...w, balance: amount, updated_at: Date.now() } : w),
      totalBalance: state.totalBalance + diff,
    }));
  },

  deleteWallet: async (id) => {
    const wallet = get().wallets.find(w => w.id === id);
    await walletRepository.delete(id);
    set(state => ({
      wallets: state.wallets.filter(w => w.id !== id),
      totalBalance: state.totalBalance - (wallet?.balance || 0),
    }));
  },

  updateLocalBalance: (walletId, delta) => {
    set(state => ({
      wallets: state.wallets.map(w =>
        w.id === walletId ? { ...w, balance: w.balance + delta } : w
      ),
      totalBalance: state.totalBalance + delta,
    }));
  },
}));
