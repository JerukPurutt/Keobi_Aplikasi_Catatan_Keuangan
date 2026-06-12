// Zustand store for saving goals (Target Tabungan)
import { create } from 'zustand';
import { SavingGoal } from '../types';
import { goalRepository } from '../db/goalRepository';
import { useWalletStore } from './useWalletStore';

interface GoalState {
  goals: SavingGoal[];
  isLoading: boolean;
  loadGoals: (userEmail: string) => Promise<void>;
  createGoal: (goal: Omit<SavingGoal, 'saved_amount'>) => Promise<void>;
  updateGoal: (id: string, fields: Partial<Pick<SavingGoal, 'title' | 'icon' | 'color' | 'target_amount' | 'deadline'>>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addSavings: (goalId: string, walletId: string, amount: number) => Promise<boolean>;
  withdrawSavings: (goalId: string, walletId: string, amount: number) => Promise<boolean>;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  isLoading: false,

  loadGoals: async (userEmail: string) => {
    set({ isLoading: true });
    try {
      const goals = await goalRepository.getAll(userEmail);
      set({ goals });
    } catch (e) {
      console.error('Failed to load goals:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  createGoal: async (goal) => {
    await goalRepository.create(goal);
    const email = goal.user_email;
    const goals = await goalRepository.getAll(email);
    set({ goals });
  },

  updateGoal: async (id, fields) => {
    await goalRepository.update(id, fields);
    set(state => ({
      goals: state.goals.map(g =>
        g.id === id ? { ...g, ...fields, updated_at: Date.now() } : g
      ),
    }));
  },

  deleteGoal: async (id) => {
    await goalRepository.delete(id);
    set(state => ({ goals: state.goals.filter(g => g.id !== id) }));
  },

  addSavings: async (goalId, walletId, amount) => {
    const success = await goalRepository.addSavings(goalId, walletId, amount);
    if (success) {
      set(state => ({
        goals: state.goals.map(g =>
          g.id === goalId
            ? { ...g, saved_amount: g.saved_amount + amount, updated_at: Date.now() }
            : g
        ),
      }));
      // Reload wallets to reflect new balance
      await useWalletStore.getState().loadWallets();
    }
    return success;
  },

  withdrawSavings: async (goalId, walletId, amount) => {
    const success = await goalRepository.withdrawSavings(goalId, walletId, amount);
    if (success) {
      set(state => ({
        goals: state.goals.map(g =>
          g.id === goalId
            ? { ...g, saved_amount: Math.max(0, g.saved_amount - amount), updated_at: Date.now() }
            : g
        ),
      }));
      // Reload wallets to reflect new balance
      await useWalletStore.getState().loadWallets();
    }
    return success;
  },
}));
