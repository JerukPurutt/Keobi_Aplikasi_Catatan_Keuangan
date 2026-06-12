// Color palette and design tokens for Keobi
export const Colors = {
  // Primary blues
  primary: '#1A6FE8',
  primaryDark: '#0D4FA8',
  primaryLight: '#4E94F0',
  primaryUltraLight: '#E8F0FE',

  // Accent yellow
  accent: '#F5C842',
  accentDark: '#D4A017',
  accentLight: '#FDE68A',

  // Semantic
  income: '#22C55E',
  incomeLight: '#DCFCE7',
  expense: '#EF4444',
  expenseLight: '#FEE2E2',

  // Light theme
  light: {
    background: '#F0F4FF',
    surface: '#FFFFFF',
    surfaceSecondary: '#F8FAFF',
    border: '#E2EAFF',
    text: '#0A1628',
    textSecondary: '#4A5568',
    textMuted: '#94A3B8',
    card: '#FFFFFF',
    tabBar: '#FFFFFF',
    input: '#F0F4FF',
    inputBorder: '#CBD5E1',
    shadow: 'rgba(26, 111, 232, 0.1)',
    overlay: 'rgba(10, 22, 40, 0.5)',
  },

  // Dark theme
  dark: {
    background: '#0A1628',
    surface: '#111827',
    surfaceSecondary: '#1A2535',
    border: '#1E3A5F',
    text: '#F0F4FF',
    textSecondary: '#94A3B8',
    textMuted: '#4A5568',
    card: '#111827',
    tabBar: '#0D1E35',
    input: '#1A2535',
    inputBorder: '#1E3A5F',
    shadow: 'rgba(0,0,0,0.4)',
    overlay: 'rgba(0,0,0,0.7)',
  },

  // Chart colors
  chartColors: [
    '#1A6FE8', '#F5C842', '#22C55E', '#EF4444',
    '#8B5CF6', '#EC4899', '#F97316', '#14B8A6',
    '#6366F1', '#A855F7', '#3B82F6', '#FBBF24',
  ],

  // Gradient
  gradientPrimary: ['#1A6FE8', '#0D4FA8'] as const,
  gradientAccent: ['#F5C842', '#D4A017'] as const,
  gradientDark: ['#0A1628', '#111827'] as const,
  gradientCard: ['#1A2535', '#0D1E35'] as const,
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
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
    shadowColor: '#1A6FE8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1A6FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1A6FE8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  dark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
};
