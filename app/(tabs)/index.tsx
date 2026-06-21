// Dashboard / Home screen for Keobi
import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Animated, Dimensions, FlatList, Platform,
  TextInput, Modal, Alert, KeyboardAvoidingView, TouchableWithoutFeedback, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useWalletStore } from '../../src/store/useWalletStore';
import { useTransactionStore } from '../../src/store/useTransactionStore';
import { useCategoryStore } from '../../src/store/useCategoryStore';
import { useGoalStore } from '../../src/store/useGoalStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { Colors, BorderRadius, FontSize, FontWeight, Shadow } from '../../src/constants/Colors';
import { formatCurrency, formatDate, formatTime, hexToRgba } from '../../src/utils/helpers';
import { Transaction, Wallet, TransactionType } from '../../src/types';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from '../../src/hooks/useTranslation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const isValidUri = (uri: string | null | undefined): boolean => {
  if (!uri) return false;
  if (typeof uri !== 'string') return false;
  const trimmed = uri.trim();
  if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null') return false;
  return true;
};

// ── Reusable Scale Pressable for Micro-interactions ──────────────────────────
function ScalePressable({ children, onPress, style, disabled }: {
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 45,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => {
        if (!disabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

// ── Balance Card ────────────────────────────────────────────────────────────
function BalanceCard({ totalBalance, income, expense }: {
  totalBalance: number; income: number; expense: number;
}) {
  const [showBalance, setShowBalance] = useState(true);
  const { t } = useTranslation();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 3000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.95, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <LinearGradient
      colors={['#1A6FE8', '#4F46E5', '#7C3AED']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.balanceCard}
    >
      {/* Decorative circles */}
      <Animated.View style={[styles.balanceCircle1, { transform: [{ scale: pulse }] }]}>
        <LinearGradient colors={['rgba(255, 255, 255, 0.14)', 'rgba(255, 255, 255, 0.01)']} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View style={[styles.balanceCircle2, { transform: [{ scale: pulse }] }]}>
        <LinearGradient colors={['rgba(245, 200, 66, 0.16)', 'rgba(245, 200, 66, 0.02)']} style={{ flex: 1 }} />
      </Animated.View>

      <View style={styles.balanceHeader}>
        <Text style={styles.balanceLabelText}>{t.totalBalance}</Text>
        <TouchableOpacity onPress={() => setShowBalance(v => !v)} activeOpacity={0.7}>
          <Ionicons name={showBalance ? 'eye' : 'eye-off'} size={20} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>
      </View>

      <Text style={styles.balanceAmount}>
        {showBalance ? formatCurrency(totalBalance) : '••••••••'}
      </Text>

      <View style={styles.balanceDivider} />

      <View style={styles.balanceStats}>
        <View style={styles.balanceStat}>
          <View style={styles.statIconContainer}>
            <Ionicons name="arrow-down-circle" size={18} color={Colors.income} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statLabel}>{t.income}</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {showBalance ? formatCurrency(income) : '••••'}
            </Text>
          </View>
        </View>
        <View style={styles.balanceStatDivider} />
        <View style={styles.balanceStat}>
          <View style={styles.statIconContainer}>
            <Ionicons name="arrow-up-circle" size={18} color={Colors.expense} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statLabel}>{t.expense}</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {showBalance ? formatCurrency(expense) : '••••'}
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

// ── Wallet Item ──────────────────────────────────────────────────────────────
function WalletItem({ wallet, onPress }: { wallet: Wallet; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <ScalePressable
      style={[styles.walletItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
    >
      <View style={[styles.walletIcon, { backgroundColor: hexToRgba(wallet.color, 0.15) }]}>
        <Ionicons name={(wallet.icon === 'bank' ? 'business' : wallet.icon) as any} size={22} color={wallet.color} />
      </View>
      <View style={styles.walletInfo}>
        <Text style={[styles.walletName, { color: colors.text }]} numberOfLines={1}>{wallet.name}</Text>
        <Text style={[styles.walletBalance, { color: wallet.color }]}>{formatCurrency(wallet.balance)}</Text>
      </View>
    </ScalePressable>
  );
}

// ── Transaction Item ─────────────────────────────────────────────────────────
function TransactionItem({ transaction, onPress }: {
  transaction: Transaction; onPress: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const isIncome = transaction.type === 'income';
  const catColor = transaction.category_color || Colors.primary;

  return (
    <ScalePressable
      style={[styles.txnItem, { backgroundColor: colors.surface }]}
      onPress={onPress}
    >
      <View style={[styles.txnIcon, { backgroundColor: hexToRgba(catColor, 0.15) }]}>
        <Ionicons name={(transaction.category_icon as any) || 'receipt'} size={20} color={catColor} />
      </View>
      <View style={styles.txnContent}>
        <Text style={[styles.txnCategory, { color: colors.text }]}>
          {transaction.category_name || t.uncategorized}
        </Text>
        <Text style={[styles.txnNote, { color: colors.textSecondary }]} numberOfLines={1}>
          {transaction.note || transaction.wallet_name || '—'}
        </Text>
      </View>
      <View style={styles.txnRight}>
        <Text style={[styles.txnAmount, { color: isIncome ? Colors.income : Colors.expense }]}>
          {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
        </Text>
        <Text style={[styles.txnDate, { color: colors.textMuted }]}>
          {formatDate(transaction.date, 'dd MMM')}
        </Text>
      </View>
    </ScalePressable>
  );
}

// ── Transaction Edit / Detail Modal ──────────────────────────────────────────
interface TransactionEditModalProps {
  visible: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSave: (id: string, oldTxn: Transaction, newTxn: Omit<Transaction, 'id' | 'created_at'>) => Promise<void>;
  onDelete: (id: string, walletId: string, type: TransactionType, amount: number) => Promise<void>;
  wallets: Wallet[];
}

function TransactionEditModal({
  visible,
  onClose,
  transaction,
  onSave,
  onDelete,
  wallets,
}: TransactionEditModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { categories, loadCategories } = useCategoryStore();

  const [mode, setMode] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState('0');
  const [note, setNote] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when transaction changes
  useEffect(() => {
    if (visible && transaction) {
      setMode(transaction.type);
      setAmountStr(String(transaction.amount));
      setNote(transaction.note || '');
      setSelectedWalletId(transaction.wallet_id);
      setSelectedCategoryId(transaction.category_id || null);
      setSelectedDate(new Date(transaction.date));
    }
  }, [visible, transaction]);

  // Load categories if not loaded
  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible]);

  if (!transaction) return null;

  const filteredCategories = categories.filter(c => c.type === mode || c.type === 'both');

  const handleSave = async () => {
    const amount = parseInt(amountStr.replace(/\D/g, ''), 10) || 0;
    if (amount <= 0) { Alert.alert('Error', t.amountInvalid); return; }
    if (!selectedWalletId) { Alert.alert('Error', t.selectWalletFirst); return; }

    const wallet = wallets.find(w => w.id === selectedWalletId);
    if (wallet && mode === 'expense') {
      const isSameWallet = selectedWalletId === transaction.wallet_id;
      const available = isSameWallet
        ? wallet.balance + (transaction.type === 'income' ? -transaction.amount : transaction.amount)
        : wallet.balance;

      if (amount > available) {
        Alert.alert(t.insufficientBalance, t.insufficientBalanceMsg);
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSave(transaction.id, transaction, {
        wallet_id: selectedWalletId,
        category_id: selectedCategoryId,
        type: mode,
        amount,
        note,
        date: selectedDate.getTime(),
      });
      onClose();
    } catch (e) {
      Alert.alert('Error', t.saveFailedMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t.deleteTxn,
      t.deleteTxnConfirm,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await onDelete(transaction.id, transaction.wallet_id, transaction.type, transaction.amount);
              onClose();
            } catch (e) {
              Alert.alert('Error', t.deleteFailedMsg);
            }
          },
        },
      ]
    );
  };

  const modeColor = mode === 'income' ? Colors.income : Colors.expense;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalSheet, { backgroundColor: colors.surface }]}
        >
          <View style={styles.modalHandle} />
          
          <View style={styles.modalHeaderRow}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t.txnDetails}</Text>
            <TouchableOpacity onPress={handleDelete} style={styles.deleteHeaderBtn}>
              <Ionicons name="trash" size={22} color={Colors.expense} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={{ flexShrink: 1, maxHeight: Dimensions.get('window').height * 0.55 }}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {/* Mode Toggle */}
            <View style={[styles.modalModeToggle, { backgroundColor: colors.surfaceSecondary }]}>
              {(['expense', 'income'] as const).map(m => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.modalModeBtn,
                    mode === m && { backgroundColor: m === 'income' ? Colors.income : Colors.expense }
                  ]}
                  onPress={() => { setMode(m); setSelectedCategoryId(null); }}
                >
                  <Text style={[styles.modalModeText, { color: mode === m ? '#fff' : colors.textMuted }]}>
                    {m === 'income' ? t.income : t.expense}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount Input */}
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t.nominal} (Rp)</Text>
            <TextInput
              style={[styles.modalInput, { color: modeColor, backgroundColor: colors.input, borderColor: modeColor, fontWeight: '700', fontSize: 18 }]}
              keyboardType="numeric"
              value={parseInt(amountStr || '0', 10).toLocaleString('id-ID')}
              onChangeText={val => {
                const clean = val.replace(/\D/g, '');
                setAmountStr(clean || '0');
              }}
            />

            {/* Wallet Selection */}
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t.selectWallet}</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.modalHorizontalList}
              contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 4 }}
            >
              {wallets.map(w => {
                const isSelected = selectedWalletId === w.id;
                return (
                  <TouchableOpacity
                    key={w.id}
                    style={[
                      styles.modalListItem,
                      { borderColor: isSelected ? w.color : colors.border, backgroundColor: isSelected ? hexToRgba(w.color, 0.12) : colors.surfaceSecondary }
                    ]}
                    onPress={() => setSelectedWalletId(w.id)}
                  >
                    <Ionicons name={(w.icon as any) || 'wallet'} size={18} color={w.color} />
                    <Text style={[styles.modalListText, { color: colors.text, fontWeight: isSelected ? '700' : '400' }]}>{w.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Category Selection */}
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t.selectCategory}</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.modalHorizontalList}
              contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 4 }}
            >
              {filteredCategories.map(c => {
                const isSelected = selectedCategoryId === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.modalListItem,
                      { borderColor: isSelected ? c.color : colors.border, backgroundColor: isSelected ? hexToRgba(c.color, 0.12) : colors.surfaceSecondary }
                    ]}
                    onPress={() => setSelectedCategoryId(c.id)}
                  >
                    <Ionicons name={(c.icon as any) || 'pricetag'} size={18} color={c.color} />
                    <Text style={[styles.modalListText, { color: colors.text, fontWeight: isSelected ? '700' : '400' }]}>{c.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Date Selection */}
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t.date}</Text>
            <TouchableOpacity
              style={[styles.modalDateBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar" size={18} color={Colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                {formatDate(selectedDate.getTime(), 'dd MMMM yyyy')}
              </Text>
            </TouchableOpacity>

            {/* Note Input */}
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>{t.note}</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]}
              placeholder={t.noNote}
              placeholderTextColor={colors.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
            />
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalActionButtons}>
            <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: Colors.primary }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {isSaving ? t.saving : t.save}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onValueChange={(_, date) => { setShowDatePicker(false); if (date) setSelectedDate(date); }}
              onDismiss={() => setShowDatePicker(false)}
              maximumDate={new Date()}
            />
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Notification Modal ───────────────────────────────────────────────────────
interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  notifications: any[];
  onMarkAllRead: () => void;
  onItemPress: (id: string) => void;
}

function NotificationModal({
  visible,
  onClose,
  notifications,
  onMarkAllRead,
  onItemPress,
}: NotificationModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHandle} />
          
          <View style={styles.modalHeaderRow}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t.profile === 'Profil' ? 'Notifikasi' : 'Notifications'}</Text>
            {notifications.some(n => !n.read) && (
              <TouchableOpacity onPress={onMarkAllRead}>
                <Text style={{ color: Colors.primary, fontWeight: '600', fontSize: FontSize.sm }}>
                  {t.profile === 'Profil' ? 'Tandai semua dibaca' : 'Mark all as read'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={{ flexShrink: 1, maxHeight: Dimensions.get('window').height * 0.6 }}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {notifications.length === 0 ? (
              <View style={styles.notifEmptyState}>
                <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.notifEmptyTitle, { color: colors.textSecondary }]}>
                  {t.profile === 'Profil' ? 'Tidak ada notifikasi' : 'No notifications'}
                </Text>
              </View>
            ) : (
              notifications.map((n, idx) => {
                return (
                  <TouchableOpacity
                    key={n.id}
                    style={[
                      styles.notifItem,
                      !n.read && { backgroundColor: hexToRgba(Colors.primary, 0.05) },
                      { borderBottomColor: colors.border }
                    ]}
                    onPress={() => onItemPress(n.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.notifIconContainer, { backgroundColor: hexToRgba(n.iconColor, 0.12) }]}>
                      <Ionicons name={n.icon} size={20} color={n.iconColor} />
                    </View>
                    
                    <View style={styles.notifContent}>
                      <View style={styles.notifHeader}>
                        <Text style={[
                          styles.notifTitle, 
                          { color: colors.text },
                          !n.read && { fontWeight: '700' }
                        ]}>
                          {n.title}
                        </Text>
                        {!n.read && (
                          <View style={styles.notifUnreadDot} />
                        )}
                      </View>
                      <Text style={[styles.notifBody, { color: colors.textSecondary }]} numberOfLines={2}>
                        {n.body}
                      </Text>
                      <Text style={[styles.notifTime, { color: colors.textMuted }]}>
                        {n.time}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border, marginTop: 12 }]} onPress={onClose}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{t.profile === 'Profil' ? 'Tutup' : 'Close'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { wallets, totalBalance, loadWallets } = useWalletStore();
  const { 
    transactions, 
    currentMonthIncome, 
    currentMonthExpense, 
    loadTransactions, 
    loadMonthSummary,
    updateTransaction,
    deleteTransaction,
  } = useTransactionStore();
  const { goals } = useGoalStore();

  // Settings & Theme
  const profileName = useSettingsStore(s => s.profile_name);
  const profileImage = useSettingsStore(s => s.profile_image);
  const dark_mode = useSettingsStore(s => s.dark_mode);
  const toggleDarkMode = useSettingsStore(s => s.toggleDarkMode);

  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);

  // Mock Notifications State
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'Selamat Datang di Keobi! 🎉',
      body: 'Kelola pemasukan dan pengeluaran harian Anda dengan mudah dan aman.',
      time: 'Baru saja',
      read: false,
      icon: 'sparkles',
      iconColor: '#1A6FE8',
    },
    {
      id: '2',
      title: 'Tips Keuangan Hari Ini 💡',
      body: 'Usahakan menyisihkan minimal 20% dari penghasilan Anda untuk tabungan atau investasi.',
      time: '2 jam yang lalu',
      read: false,
      icon: 'bulb',
      iconColor: '#F5C842',
    },
    {
      id: '3',
      title: 'Buat Target Tabungan! 🏆',
      body: 'Wujudkan impian Anda dengan membuat target tabungan baru di menu Target Tabungan.',
      time: '1 hari yang lalu',
      read: false,
      icon: 'trophy',
      iconColor: '#22C55E',
    },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleItemPress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const getGreetingText = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return t.greeting_morning;
    if (hour >= 11 && hour < 15) return t.greeting_afternoon;
    if (hour >= 15 && hour < 18) return t.greeting_evening;
    return t.greeting_night;
  };

  // Staggered dashboard entrance animations
  const fadeHeader = useRef(new Animated.Value(0)).current;
  const fadeCard = useRef(new Animated.Value(0)).current;
  const fadeWallets = useRef(new Animated.Value(0)).current;
  const fadeActions = useRef(new Animated.Value(0)).current;
  const fadeTxns = useRef(new Animated.Value(0)).current;

  const slideHeader = useRef(new Animated.Value(25)).current;
  const slideCard = useRef(new Animated.Value(25)).current;
  const slideWallets = useRef(new Animated.Value(25)).current;
  const slideActions = useRef(new Animated.Value(25)).current;
  const slideTxns = useRef(new Animated.Value(25)).current;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadWallets(), loadTransactions(true), loadMonthSummary()]);
    setRefreshing(false);
  }, []);

  const handleSelectTransaction = (txn: Transaction) => {
    setSelectedTxn(txn);
    setShowEditModal(true);
  };

  useFocusEffect(
    useCallback(() => {
      // Reset animations
      fadeHeader.setValue(0);
      fadeCard.setValue(0);
      fadeWallets.setValue(0);
      fadeActions.setValue(0);
      fadeTxns.setValue(0);

      slideHeader.setValue(25);
      slideCard.setValue(25);
      slideWallets.setValue(25);
      slideActions.setValue(25);
      slideTxns.setValue(25);

      loadWallets();
      loadTransactions(true);
      loadMonthSummary();

      const createStagger = (fade: Animated.Value, slide: Animated.Value) => {
        return Animated.parallel([
          Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.spring(slide, { toValue: 0, friction: 8, tension: 35, useNativeDriver: true }),
        ]);
      };

      Animated.stagger(80, [
        createStagger(fadeHeader, slideHeader),
        createStagger(fadeCard, slideCard),
        createStagger(fadeWallets, slideWallets),
        createStagger(fadeActions, slideActions),
        createStagger(fadeTxns, slideTxns),
      ]).start();
    }, [])
  );

  const recentTransactions = showAll ? transactions : transactions.slice(0, 15);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <Animated.View 
          style={[
            styles.header, 
            { paddingTop: insets.top + 12, opacity: fadeHeader, transform: [{ translateY: slideHeader }] }
          ]}
        >
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.greetingLabel, { color: colors.textSecondary }]}>
              {getGreetingText()}
            </Text>
            <Text style={[styles.profileNameHeader, { color: colors.text }]} numberOfLines={1}>
              {profileName}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {/* Theme Toggle Button */}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={toggleDarkMode}
              activeOpacity={0.7}
            >
              <Ionicons name={dark_mode ? 'sunny' : 'moon'} size={20} color={Colors.primary} />
            </TouchableOpacity>

            {/* Profile Avatar Button */}
            <TouchableOpacity
              style={[styles.avatarButton, { borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/profile' as any);
              }}
              activeOpacity={0.7}
            >
              {profileImage && isValidUri(profileImage) ? (
                <Image source={{ uri: profileImage }} style={styles.headerAvatarImage} />
              ) : (
                <View style={[styles.headerAvatarPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[styles.headerAvatarText, { color: Colors.primary }]}>
                    {(profileName || 'P')[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Balance Card */}
        <Animated.View 
          style={[
            styles.cardContainer, 
            { opacity: fadeCard, transform: [{ translateY: slideCard }] }
          ]}
        >
          <BalanceCard
            totalBalance={totalBalance}
            income={currentMonthIncome}
            expense={currentMonthExpense}
          />
        </Animated.View>

        {/* Wallets Section */}
        <Animated.View 
          style={[
            styles.section, 
            { opacity: fadeWallets, transform: [{ translateY: slideWallets }] }
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.myWallets}</Text>
            <TouchableOpacity onPress={() => router.push('/profile' as any)} activeOpacity={0.7}>
              <Text style={[styles.sectionAction, { color: Colors.primary }]}>{t.profile === 'Profil' ? 'Kelola' : 'Manage'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.walletScroll}>
            {wallets.map(wallet => (
              <WalletItem
                key={wallet.id}
                wallet={wallet}
                onPress={() => {}}
              />
            ))}
            <ScalePressable
              style={[styles.addWalletBtn, { borderColor: Colors.primary }]}
              onPress={() => router.push('/profile' as any)}
            >
              <Ionicons name="add" size={24} color={Colors.primary} />
              <Text style={[styles.addWalletText, { color: Colors.primary }]}>{t.profile === 'Profil' ? 'Tambah' : 'Add'}</Text>
            </ScalePressable>
          </ScrollView>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View 
          style={[
            styles.section, 
            { opacity: fadeActions, transform: [{ translateY: slideActions }] }
          ]}
        >
          <View style={styles.quickActions}>
            <ScalePressable
              style={[styles.quickAction, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              onPress={() => router.push('/(tabs)/reports' as any)}
            >
              <View style={[styles.quickActionIconCircle, { backgroundColor: hexToRgba('#8B5CF6', 0) }]}>
                <Ionicons name="bar-chart" size={16} color="#8B5CF6" />
              </View>
              <Text style={[styles.quickActionText, { color: colors.text }]}>{t.reportsTitle}</Text>
            </ScalePressable>
            <ScalePressable
              style={[styles.quickAction, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              onPress={() => router.push('/(tabs)/analytics' as any)}
            >
              <View style={[styles.quickActionIconCircle, { backgroundColor: hexToRgba(Colors.primary, 0) }]}>
                <Ionicons name="analytics" size={16} color={Colors.primary} />
              </View>
              <Text style={[styles.quickActionText, { color: colors.text }]}>{t.analyticsTitle}</Text>
            </ScalePressable>
          </View>
        </Animated.View>

        {/* Goals Shortcut Banner */}
        <Animated.View
          style={[
            styles.section,
            { opacity: fadeActions, transform: [{ translateY: slideActions }] },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => router.push('/goals' as any)}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.goalsBanner}
            >
              <View style={styles.goalsBannerLeft}>
                <View style={styles.goalsBannerIconBg}>
                  <Ionicons name="trophy" size={22} color="#fff" />
                </View>
                <View>
                  <Text style={styles.goalsBannerTitle}>{t.savingGoalTitle}</Text>
                  <Text style={styles.goalsBannerSub}>
                    {goals.length === 0
                      ? t.noGoalDesc
                      : `${goals.length} ${t.profile === 'Profil' ? 'target aktif' : 'active goals'} · ${formatCurrency(goals.reduce((s, g) => s + g.saved_amount, 0))} ${t.profile === 'Profil' ? 'tersimpan' : 'saved'}`
                    }
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Recent Transactions */}
        <Animated.View 
          style={[
            styles.section, 
            { opacity: fadeTxns, transform: [{ translateY: slideTxns }] }
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.recentTxns}</Text>
            <TouchableOpacity onPress={() => setShowAll(s => !s)} activeOpacity={0.7}>
              <Text style={[styles.sectionAction, { color: Colors.primary }]}>
                {showAll ? (t.profile === 'Profil' ? 'Sembunyikan' : 'Hide') : t.viewAll}
              </Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>{t.noTxns}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {t.profile === 'Profil' ? 'Mulai catat pemasukan atau pengeluaranmu' : 'Start recording your income or expenses'}
              </Text>
            </View>
          ) : (
            <View style={[styles.txnList, { backgroundColor: colors.surface }]}>
              {recentTransactions.map((txn, idx) => (
                <React.Fragment key={txn.id}>
                  <TransactionItem transaction={txn} onPress={() => handleSelectTransaction(txn)} />
                  {idx < recentTransactions.length - 1 && (
                    <View style={[styles.txnDivider, { backgroundColor: colors.border }]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Edit Modal */}
      <TransactionEditModal
        visible={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedTxn(null); }}
        transaction={selectedTxn}
        onSave={async (id, old, data) => {
          await updateTransaction(id, old, data);
          await loadWallets(); // Reload wallets so balance updates
        }}
        onDelete={async (id, wId, type, amt) => {
          await deleteTransaction(id, wId, type, amt);
          await loadWallets(); // Reload wallets so balance updates
        }}
        wallets={wallets}
      />

      {/* Notifications Modal */}
      <NotificationModal
        visible={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        onItemPress={handleItemPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  greetingText: { fontSize: 13, marginTop: 2 },
  notifButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardContainer: { paddingHorizontal: 20, marginTop: 8 },
  // Balance Card
  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: 24,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  balanceCircle1: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  balanceCircle2: {
    position: 'absolute', bottom: -60, left: 20,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },

  balanceHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  balanceLabelText: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.sm },
  balanceAmount: {
    color: '#fff', fontSize: 32, fontWeight: '800',
    marginTop: 8, marginBottom: 20, letterSpacing: -1,
  },
  balanceDivider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 16,
  },
  balanceStats: { flexDirection: 'row', alignItems: 'center' },
  balanceStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  balanceStatDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 16 },
  statIconContainer: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  statValue: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
  // Section
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  sectionAction: { fontSize: FontSize.sm, fontWeight: '600' },
  // Wallets
  walletScroll: { marginHorizontal: -4 },
  walletItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: BorderRadius.md, marginHorizontal: 4,
    borderWidth: 1, minWidth: 155,
  },
  walletIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  walletInfo: { flex: 1 },
  walletName: { fontSize: FontSize.xs, fontWeight: '600' },
  walletBalance: { fontSize: FontSize.sm, fontWeight: '700', marginTop: 2 },
  addWalletBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: BorderRadius.lg, borderWidth: 1.5,
    borderStyle: 'dashed', marginHorizontal: 4, gap: 4, minWidth: 90,
  },
  addWalletText: { fontSize: 12, fontWeight: '600' },
  // Quick Actions
  quickActions: { flexDirection: 'row', gap: 12 },
  quickAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingVertical: 10,
    borderRadius: BorderRadius.md, borderWidth: 1,
  },
  quickActionText: { fontSize: FontSize.sm, fontWeight: '700' },
  quickActionIconCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  // Transactions
  txnList: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  txnItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  txnDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  txnIcon: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  txnContent: { flex: 1 },
  txnCategory: { fontSize: FontSize.md, fontWeight: '600' },
  txnNote: { fontSize: FontSize.sm, marginTop: 2 },
  txnRight: { alignItems: 'flex-end' },
  txnAmount: { fontSize: FontSize.md, fontWeight: '700' },
  txnDate: { fontSize: 11, marginTop: 2 },
  // Empty state
  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 48, borderRadius: BorderRadius.lg, gap: 8,
  },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '600' },
  emptySubtitle: { fontSize: FontSize.sm, textAlign: 'center', paddingHorizontal: 24 },
  // Modal Edit / Detail Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  deleteHeaderBtn: {
    padding: 6,
    borderRadius: BorderRadius.md,
  },
  modalModeToggle: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: 16,
  },
  modalModeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  modalModeText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  modalLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    padding: 12,
    fontSize: FontSize.md,
    marginBottom: 12,
  },
  modalHorizontalList: {
    flexDirection: 'row',
    marginBottom: 12,
    marginHorizontal: -4,
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    marginRight: 8,
    marginVertical: 4,
  },
  modalListText: {
    fontSize: FontSize.sm,
  },
  modalDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    marginBottom: 12,
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 24,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Goals Banner
  goalsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.lg,
    padding: 16,
  },
  goalsBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  goalsBannerIconBg: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  goalsBannerTitle: { color: '#fff', fontSize: FontSize.md, fontWeight: '700', marginBottom: 2 },
  goalsBannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.xs },
  
  // Header Greeting & Actions
  greetingLabel: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  profileNameHeader: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badgeContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  avatarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  headerAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  // Notifications Modal Items
  notifEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  notifEmptyTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  notifItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
    alignItems: 'flex-start',
    borderRadius: BorderRadius.md,
    marginVertical: 2,
  },
  notifIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: {
    flex: 1,
    gap: 4,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  notifBody: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 11,
    marginTop: 2,
  },
  notifUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },
});
