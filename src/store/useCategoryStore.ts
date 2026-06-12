// Zustand store for categories
import { create } from 'zustand';
import { Category, CategoryType } from '../types';
import { categoryRepository } from '../db/categoryRepository';

interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  loadCategories: () => Promise<void>;
  addCategory: (data: Omit<Category, 'id' | 'created_at' | 'is_default'>) => Promise<Category>;
  updateCategory: (id: string, data: Partial<Omit<Category, 'id' | 'created_at' | 'is_default'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  getCategoriesByType: (type: 'income' | 'expense') => Category[];
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoading: false,

  loadCategories: async () => {
    set({ isLoading: true });
    try {
      const categories = await categoryRepository.getAll();
      set({ categories, isLoading: false });
    } catch (error) {
      console.error('Failed to load categories:', error);
      set({ isLoading: false });
    }
  },

  addCategory: async (data) => {
    const category = await categoryRepository.create(data);
    set(state => ({ categories: [...state.categories, category] }));
    return category;
  },

  updateCategory: async (id, data) => {
    await categoryRepository.update(id, data);
    set(state => ({
      categories: state.categories.map(c => c.id === id ? { ...c, ...data } : c),
    }));
  },

  deleteCategory: async (id) => {
    await categoryRepository.delete(id);
    set(state => ({ categories: state.categories.filter(c => c.id !== id) }));
  },

  getCategoriesByType: (type) => {
    return get().categories.filter(c => c.type === type || c.type === 'both');
  },
}));
