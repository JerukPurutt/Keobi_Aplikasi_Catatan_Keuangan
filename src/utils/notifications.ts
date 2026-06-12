// Notification helper for Keobi financial reminders
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestNotificationPermission = async (): Promise<boolean> => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const scheduleWeeklyReminder = async () => {
  // Cancel existing scheduled notifications first
  await Notifications.cancelAllScheduledNotificationsAsync();

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  // Weekly reminder every Sunday at 8pm
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💰 Keobi — Rekap Mingguan',
      body: 'Yuk cek kondisi keuangan minggu ini! Jangan lupa catat semua transaksi.',
      sound: true,
      data: { screen: 'reports' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday
      hour: 20,
      minute: 0,
    },
  });
};

export const scheduleDailyReminder = async (hour = 21, minute = 0) => {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📝 Jangan lupa catat transaksi hari ini!',
      body: 'Buka Keobi dan catat semua pemasukan & pengeluaranmu.',
      sound: true,
      data: { screen: 'transactions' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
};

export const sendBudgetAlert = async (category: string, percentage: number) => {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⚠️ Budget ${category} hampir habis!`,
      body: `Kamu sudah menggunakan ${percentage.toFixed(0)}% budget ${category} bulan ini.`,
      sound: true,
    },
    trigger: null, // Send immediately
  });
};
