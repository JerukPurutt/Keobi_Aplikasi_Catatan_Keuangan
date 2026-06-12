// Utility functions for Keobi
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, subDays, subWeeks, subMonths, eachDayOfInterval, eachWeekOfInterval } from 'date-fns';
import { id } from 'date-fns/locale';

// ──────────────────────────────────────────
// Currency Formatting
// ──────────────────────────────────────────
export const formatCurrency = (amount: number, compact = false): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
};

// ──────────────────────────────────────────
// Date Utilities
// ──────────────────────────────────────────
export const formatDate = (timestamp: number, fmt = 'dd MMM yyyy'): string => {
  return format(new Date(timestamp), fmt, { locale: id });
};

export const formatDateShort = (timestamp: number): string => {
  return format(new Date(timestamp), 'dd/MM', { locale: id });
};

export const formatDateFull = (timestamp: number): string => {
  return format(new Date(timestamp), 'EEEE, dd MMMM yyyy', { locale: id });
};

export const formatTime = (timestamp: number): string => {
  return format(new Date(timestamp), 'HH:mm', { locale: id });
};

export const getDateRangeForPeriod = (period: 'daily' | 'weekly' | 'monthly', offset = 0) => {
  const now = new Date();

  if (period === 'daily') {
    const target = subDays(now, offset);
    return {
      start: startOfDay(target).getTime(),
      end: endOfDay(target).getTime(),
      label: offset === 0 ? 'Hari Ini' : format(target, 'dd MMM', { locale: id }),
    };
  }

  if (period === 'weekly') {
    const target = subWeeks(now, offset);
    const weekStart = startOfWeek(target, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(target, { weekStartsOn: 1 });
    return {
      start: weekStart.getTime(),
      end: weekEnd.getTime(),
      label: offset === 0 ? 'Minggu Ini' : `${format(weekStart, 'dd MMM', { locale: id })} - ${format(weekEnd, 'dd MMM', { locale: id })}`,
    };
  }

  // Monthly
  const target = subMonths(now, offset);
  return {
    start: startOfMonth(target).getTime(),
    end: endOfMonth(target).getTime(),
    label: offset === 0 ? 'Bulan Ini' : format(target, 'MMMM yyyy', { locale: id }),
  };
};

export const getDaysInRange = (start: number, end: number) => {
  return eachDayOfInterval({ start: new Date(start), end: new Date(end) });
};

// ──────────────────────────────────────────
// ID Generation
// ──────────────────────────────────────────
export const generateId = (prefix = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// ──────────────────────────────────────────
// Number Utilities
// ──────────────────────────────────────────
export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

// ──────────────────────────────────────────
// PIN Utilities
// ──────────────────────────────────────────
export const hashPin = async (pin: string): Promise<string> => {
  // Simple hash for PIN - in production use a proper crypto library
  let hash = 0;
  const saltedPin = `keobi_${pin}_salt_2024`;
  for (let i = 0; i < saltedPin.length; i++) {
    const char = saltedPin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

export const verifyPin = async (pin: string, hash: string): Promise<boolean> => {
  const inputHash = await hashPin(pin);
  return inputHash === hash;
};

// ──────────────────────────────────────────
// Password Utilities
// ──────────────────────────────────────────
export const hashPassword = async (password: string): Promise<string> => {
  let hash = 0;
  const salted = `keobi_pwd_${password}_salt_2026`;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
};

// ──────────────────────────────────────────
// Color Utilities
// ──────────────────────────────────────────
export const hexToRgba = (hex: string, alpha: number): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(0,0,0,${alpha})`;
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
};

export const getContrastColor = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '#000000';
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};
