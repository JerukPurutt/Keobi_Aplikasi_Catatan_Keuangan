// Color palette and design tokens for Keobi (Fresh Ocean Blue & Crisp White Shadcn Style)
export const Colors = {
  // Primary Ocean Blues
  primary: '#0284C7',          // Sky-600 / Fresh Ocean Blue
  primaryDark: '#0369A1',      // Sky-700 / Deep Ocean Blue
  primaryLight: '#0EA5E9',     // Sky-500 / Bright Sea Blue
  primaryUltraLight: '#F0F9FF',// Sky-50 / Ocean Mist White
  primaryTint: '#E0F2FE',      // Sky-100 / Soft Aqua Ice

  // Accent Aqua & Cyan
  accent: '#06B6D4',           // Cyan-500 / Fresh Aqua
  accentDark: '#0891B2',       // Cyan-600
  accentLight: '#BAE6FD',      // Sky-200
  accentMuted: '#E0F2FE',

  // Semantic
  income: '#10B981',           // Emerald-500 / Mint Green
  incomeDark: '#059669',
  incomeLight: '#ECFDF5',
  expense: '#F43F5E',          // Rose-500 / Coral Red
  expenseDark: '#E11D48',
  expenseLight: '#FFF1F2',

  // Light theme (Crisp Pure White & Fresh Ocean Blue)
  light: {
    background: '#F8FAFC',      // Airy, fresh light slate/white
    surface: '#FFFFFF',         // Pure White
    surfaceSecondary: '#F0F9FF',// Soft Ocean Mist
    border: '#E2E8F0',          // Crisp Shadcn border
    borderSubtle: '#F1F5F9',
    text: '#0F172A',            // Slate-900 / High contrast readable text
    textSecondary: '#475569',   // Slate-600
    textMuted: '#94A3B8',       // Slate-400
    card: '#FFFFFF',
    tabBar: '#FFFFFF',
    input: '#FFFFFF',
    inputBorder: '#E2E8F0',
    shadow: 'rgba(2, 132, 199, 0.08)',
    overlay: 'rgba(15, 23, 42, 0.45)',
  },

  // Dark theme (Deep Ocean Midnight)
  dark: {
    background: '#070D18',      // Deep Ocean Midnight
    surface: '#0F1B2D',         // Navy Ocean Surface
    surfaceSecondary: '#16253D',
    border: '#1E3252',
    borderSubtle: '#15243B',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    card: '#0F1B2D',
    tabBar: '#0A1322',
    input: '#16253D',
    inputBorder: '#1E3252',
    shadow: 'rgba(0,0,0,0.4)',
    overlay: 'rgba(0,0,0,0.7)',
  },

  // Chart colors (Ocean & vibrant harmonized)
  chartColors: [
    '#0284C7', '#0EA5E9', '#10B981', '#F43F5E',
    '#06B6D4', '#8B5CF6', '#EC4899', '#F59E0B',
    '#3B82F6', '#14B8A6', '#6366F1', '#10B981',
  ],

  // Gradients
  gradientPrimary: ['#0284C7', '#0EA5E9'] as const,   // Fresh Ocean Sea Blue
  gradientOceanCard: ['#0284C7', '#0369A1'] as const, // Ocean Blue Gradient
  gradientAqua: ['#0EA5E9', '#06B6D4'] as const,
  gradientAccent: ['#0EA5E9', '#0284C7'] as const,
  gradientDark: ['#070D18', '#0F1B2D'] as const,
  gradientCard: ['#16253D', '#0F1B2D'] as const,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const Shadow = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 6,
  },
  ocean: {
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  dark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
};
