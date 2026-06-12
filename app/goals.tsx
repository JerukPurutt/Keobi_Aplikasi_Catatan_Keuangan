// Goals screen — Target Tabungan Keobi
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Platform, StatusBar, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useGoalStore } from '../src/store/useGoalStore';
import { useWalletStore } from '../src/store/useWalletStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { useTheme } from '../src/hooks/useTheme';
import { Colors, BorderRadius, FontSize, Shadow } from '../src/constants/Colors';
import { formatCurrency, formatDate, hexToRgba, generateId } from '../src/utils/helpers';
import { SavingGoal } from '../src/types';

// ── Constants ────────────────────────────────────────────────────────────────
const GOAL_ICONS = [
  'trophy', 'home', 'car', 'airplane', 'school', 'laptop', 'phone-portrait',
  'camera', 'bicycle', 'heart', 'gift', 'diamond', 'star', 'rocket', 'bag',
];

const GOAL_COLORS = [
  '#1A6FE8', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#F97316', '#14B8A6', '#6366F1', '#A855F7',
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function daysLeft(deadline: number | null): string {
  if (!deadline) return '';
  const diff = Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Lewat tenggat';
  if (diff === 0) return 'Hari ini!';
  return `${diff} hari lagi`;
}

// ── Goal Card ─────────────────────────────────────────────────────────────────
function GoalCard({
  goal,
  onPress,
  onDelete,
}: {
  goal: SavingGoal;
  onPress: () => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const progress = goal.target_amount > 0
    ? Math.min(goal.saved_amount / goal.target_amount, 1)
    : 0;
  const pct = Math.round(progress * 100);
  const done = progress >= 1;

  return (
    <TouchableOpacity
      style={[styles.goalCard, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Top row */}
      <View style={styles.goalCardTop}>
        <View style={[styles.goalIconBg, { backgroundColor: hexToRgba(goal.color, 0.15) }]}>
          <Ionicons name={(goal.icon as any) || 'trophy'} size={22} color={goal.color} />
        </View>
        <View style={styles.goalCardMeta}>
          <Text style={[styles.goalTitle, { color: colors.text }]} numberOfLines={1}>
            {goal.title}
          </Text>
          {goal.deadline ? (
            <Text style={[styles.goalDeadline, { color: done ? Colors.income : colors.textMuted }]}>
              {done ? '🎉 Tercapai!' : `⏰ ${daysLeft(goal.deadline)} · ${formatDate(goal.deadline)}`}
            </Text>
          ) : (
            <Text style={[styles.goalDeadline, { color: done ? Colors.income : colors.textMuted }]}>
              {done ? '🎉 Tercapai!' : 'Tanpa tenggat'}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: hexToRgba(goal.color, 0.12) }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${pct}%` as any, backgroundColor: done ? Colors.income : goal.color },
          ]}
        />
      </View>

      {/* Amounts */}
      <View style={styles.goalAmounts}>
        <Text style={[styles.savedAmt, { color: done ? Colors.income : goal.color }]}>
          {formatCurrency(goal.saved_amount)}
        </Text>
        <Text style={[styles.targetAmt, { color: colors.textMuted }]}>
          dari {formatCurrency(goal.target_amount)} · {pct}%
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function GoalsScreen() {
  const { colors } = useTheme();
  const { login_email } = useSettingsStore();
  const { goals, isLoading, loadGoals, createGoal, deleteGoal, addSavings, withdrawSavings } = useGoalStore();
  const { wallets } = useWalletStore();

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingGoal | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'add' | 'withdraw'>('add');
  const [actionAmount, setActionAmount] = useState('');
  const [actionWalletId, setActionWalletId] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Create form
  const [formTitle, setFormTitle] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formIcon, setFormIcon] = useState('trophy');
  const [formColor, setFormColor] = useState(GOAL_COLORS[0]);
  const [formDeadline, setFormDeadline] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (login_email) loadGoals(login_email);
  }, [login_email]);

  const resetCreateForm = () => {
    setFormTitle(''); setFormTarget(''); setFormIcon('trophy');
    setFormColor(GOAL_COLORS[0]); setFormDeadline(null);
    setFormError('');
  };

  const handleCreate = useCallback(async () => {
    if (!formTitle.trim()) { setFormError('Judul wajib diisi'); return; }
    const target = parseFloat(formTarget.replace(/\D/g, ''));
    if (!target || target <= 0) { setFormError('Target harus lebih dari 0'); return; }

    setFormLoading(true);
    try {
      const now = Date.now();
      await createGoal({
        id: generateId('goal'),
        user_email: login_email,
        title: formTitle.trim(),
        icon: formIcon,
        color: formColor,
        target_amount: target,
        deadline: formDeadline ? formDeadline.getTime() : null,
        created_at: now,
        updated_at: now,
      });
      setShowCreateModal(false);
      resetCreateForm();
    } catch {
      setFormError('Gagal membuat target');
    } finally {
      setFormLoading(false);
    }
  }, [formTitle, formTarget, formIcon, formColor, formDeadline, login_email]);

  const openAction = (goal: SavingGoal, type: 'add' | 'withdraw') => {
    setSelectedGoal(goal);
    setActionType(type);
    setActionAmount('');
    setActionWalletId(wallets[0]?.id ?? '');
    setActionError('');
    setShowActionModal(true);
  };

  const handleAction = useCallback(async () => {
    if (!selectedGoal) return;
    const amount = parseFloat(actionAmount.replace(/\D/g, ''));
    if (!amount || amount <= 0) { setActionError('Nominal harus lebih dari 0'); return; }
    if (!actionWalletId) { setActionError('Pilih dompet'); return; }

    setActionLoading(true);
    try {
      const ok = actionType === 'add'
        ? await addSavings(selectedGoal.id, actionWalletId, amount)
        : await withdrawSavings(selectedGoal.id, actionWalletId, amount);

      if (!ok) {
        setActionError(
          actionType === 'add'
            ? 'Saldo dompet tidak cukup'
            : 'Tabungan yang tersimpan tidak cukup'
        );
      } else {
        setShowActionModal(false);
      }
    } catch {
      setActionError('Terjadi kesalahan');
    } finally {
      setActionLoading(false);
    }
  }, [selectedGoal, actionType, actionAmount, actionWalletId]);

  const handleDelete = (goal: SavingGoal) => {
    // Using inline confirm since Alert is monkeypatched
    (require('react-native').Alert as any).alert(
      'Hapus Target',
      `Hapus target "${goal.title}"? Tabungan yang tersimpan (${formatCurrency(goal.saved_amount)}) TIDAK dikembalikan ke dompet.`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus', style: 'destructive', onPress: () => deleteGoal(goal.id) },
      ]
    );
  };

  const totalSaved = goals.reduce((s, g) => s + g.saved_amount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <LinearGradient
        colors={['#1A6FE8', '#4F46E5']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Target Tabungan</Text>
          <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.headerSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Tersimpan</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalSaved)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Target</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalTarget)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Target Aktif</Text>
            <Text style={styles.summaryValue}>{goals.length}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Goals List */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {goals.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Belum Ada Target</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
              Tap tombol + untuk membuat target tabungan pertamamu
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: Colors.primary }]}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.emptyBtnText}>Buat Target Sekarang</Text>
            </TouchableOpacity>
          </View>
        )}

        {goals.map(goal => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onPress={() => { setSelectedGoal(goal); setShowActionModal(true); setActionType('add'); setActionAmount(''); setActionWalletId(wallets[0]?.id ?? ''); setActionError(''); }}
            onDelete={() => handleDelete(goal)}
          />
        ))}
      </ScrollView>

      {/* Action Modal (Add / Withdraw) */}
      <Modal visible={showActionModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowActionModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <TouchableOpacity activeOpacity={1}>
              <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
                <View style={styles.sheetHandle} />
                {selectedGoal && (
                  <>
                    {/* Goal info */}
                    <View style={styles.sheetGoalInfo}>
                      <View style={[styles.goalIconBg, { backgroundColor: hexToRgba(selectedGoal.color, 0.15) }]}>
                        <Ionicons name={(selectedGoal.icon as any) || 'trophy'} size={20} color={selectedGoal.color} />
                      </View>
                      <View>
                        <Text style={[styles.sheetGoalTitle, { color: colors.text }]}>{selectedGoal.title}</Text>
                        <Text style={[styles.sheetGoalProgress, { color: colors.textMuted }]}>
                          {formatCurrency(selectedGoal.saved_amount)} / {formatCurrency(selectedGoal.target_amount)}
                        </Text>
                      </View>
                    </View>

                    {/* Action Tabs */}
                    <View style={[styles.actionTabs, { backgroundColor: colors.background }]}>
                      {(['add', 'withdraw'] as const).map(type => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.actionTab,
                            actionType === type && { backgroundColor: Colors.primary },
                          ]}
                          onPress={() => { setActionType(type); setActionError(''); }}
                        >
                          <Ionicons
                            name={type === 'add' ? 'add-circle-outline' : 'remove-circle-outline'}
                            size={16}
                            color={actionType === type ? '#fff' : colors.textMuted}
                          />
                          <Text style={[
                            styles.actionTabText,
                            { color: actionType === type ? '#fff' : colors.textMuted },
                          ]}>
                            {type === 'add' ? 'Tambah Tabungan' : 'Tarik Tabungan'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Wallet Picker */}
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                      {actionType === 'add' ? 'Ambil dari Dompet' : 'Kembalikan ke Dompet'}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                        {wallets.map(w => (
                          <TouchableOpacity
                            key={w.id}
                            style={[
                              styles.walletChip,
                              { borderColor: actionWalletId === w.id ? w.color : colors.border, backgroundColor: actionWalletId === w.id ? hexToRgba(w.color, 0.12) : colors.background },
                            ]}
                            onPress={() => setActionWalletId(w.id)}
                          >
                            <Ionicons name={(w.icon as any) || 'wallet'} size={14} color={w.color} />
                            <Text style={[styles.walletChipName, { color: colors.text }]}>{w.name}</Text>
                            <Text style={[styles.walletChipBalance, { color: colors.textMuted }]}>
                              {formatCurrency(w.balance)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>

                    {/* Amount input */}
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Nominal</Text>
                    <View style={[styles.amountInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[styles.amountPrefix, { color: colors.textMuted }]}>Rp</Text>
                      <TextInput
                        style={[styles.amountField, { color: colors.text }]}
                        value={actionAmount ? Number(actionAmount.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                        onChangeText={v => setActionAmount(v.replace(/\D/g, ''))}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>

                    {actionError ? (
                      <Text style={styles.errorText}>{actionError}</Text>
                    ) : null}

                    <TouchableOpacity
                      style={[
                        styles.submitBtn,
                        { backgroundColor: actionType === 'add' ? Colors.primary : Colors.expense },
                        actionLoading && { opacity: 0.6 },
                      ]}
                      onPress={handleAction}
                      disabled={actionLoading}
                    >
                      <Text style={styles.submitBtnText}>
                        {actionLoading ? 'Memproses...' : actionType === 'add' ? 'Tambah Tabungan' : 'Tarik Tabungan'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Create Goal Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => { setShowCreateModal(false); resetCreateForm(); }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <TouchableOpacity activeOpacity={1}>
              <View style={[styles.sheet, styles.sheetTall, { backgroundColor: colors.surface }]}>
                <View style={styles.sheetHandle} />
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Target Baru</Text>

                {/* Title */}
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Nama Target</Text>
                <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.inputText, { color: colors.text }]}
                    placeholder="Contoh: Beli Laptop, Liburan Bali..."
                    placeholderTextColor={colors.textMuted}
                    value={formTitle}
                    onChangeText={setFormTitle}
                  />
                </View>

                {/* Target Amount */}
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Target Nominal</Text>
                <View style={[styles.amountInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.amountPrefix, { color: colors.textMuted }]}>Rp</Text>
                  <TextInput
                    style={[styles.amountField, { color: colors.text }]}
                    value={formTarget ? Number(formTarget.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                    onChangeText={v => setFormTarget(v.replace(/\D/g, ''))}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                {/* Deadline */}
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Tenggat Waktu (opsional)</Text>
                <TouchableOpacity
                  style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                  <Text style={{ color: formDeadline ? colors.text : colors.textMuted, flex: 1 }}>
                    {formDeadline ? formatDate(formDeadline.getTime()) : 'Pilih tanggal (opsional)'}
                  </Text>
                  {formDeadline && (
                    <TouchableOpacity onPress={() => setFormDeadline(null)}>
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={formDeadline ?? new Date()}
                    mode="date"
                    minimumDate={new Date()}
                    display="default"
                    onValueChange={(_event: any, date?: Date) => { setShowDatePicker(false); if (date) setFormDeadline(date); }}
                    onDismiss={() => setShowDatePicker(false)}
                  />
                )}

                {/* Icon picker */}
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Ikon</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                    {GOAL_ICONS.map(ic => (
                      <TouchableOpacity
                        key={ic}
                        style={[
                          styles.iconOpt,
                          { backgroundColor: hexToRgba(formColor, 0.1) },
                          formIcon === ic && { backgroundColor: hexToRgba(formColor, 0.3), borderWidth: 2, borderColor: formColor },
                        ]}
                        onPress={() => setFormIcon(ic)}
                      >
                        <Ionicons name={(ic as any)} size={20} color={formIcon === ic ? formColor : colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {/* Color picker */}
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Warna</Text>
                <View style={styles.colorRow}>
                  {GOAL_COLORS.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colorDot, { backgroundColor: c }, formColor === c && styles.colorDotSelected]}
                      onPress={() => setFormColor(c)}
                    />
                  ))}
                </View>

                {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: Colors.primary }, formLoading && { opacity: 0.6 }]}
                  onPress={handleCreate}
                  disabled={formLoading}
                >
                  <Text style={styles.submitBtnText}>{formLoading ? 'Menyimpan...' : 'Buat Target'}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { flex: 1, color: '#fff', fontSize: FontSize.xl, fontWeight: '700' },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerSummary: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadius.lg,
    padding: 16,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs, marginBottom: 4 },
  summaryValue: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 8 },
  // Goal Card
  goalCard: {
    borderRadius: BorderRadius.lg,
    padding: 16,
    ...Shadow.md,
  },
  goalCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  goalIconBg: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  goalCardMeta: { flex: 1 },
  goalTitle: { fontSize: FontSize.md, fontWeight: '700', marginBottom: 2 },
  goalDeadline: { fontSize: FontSize.xs },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  goalAmounts: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  savedAmt: { fontSize: FontSize.md, fontWeight: '700' },
  targetAmt: { fontSize: FontSize.xs },
  // Empty state
  emptyState: { flex: 1, alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '700', marginTop: 12 },
  emptyDesc: { fontSize: FontSize.sm, textAlign: 'center', maxWidth: 260, lineHeight: 20 },
  emptyBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: BorderRadius.lg },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
  },
  sheetTall: { maxHeight: '90%' },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontSize: FontSize.xl, fontWeight: '700', marginBottom: 16 },
  sheetGoalInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sheetGoalTitle: { fontSize: FontSize.md, fontWeight: '700' },
  sheetGoalProgress: { fontSize: FontSize.xs },
  // Tabs
  actionTabs: { flexDirection: 'row', borderRadius: BorderRadius.md, padding: 4, marginBottom: 16, gap: 4 },
  actionTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: BorderRadius.sm,
  },
  actionTabText: { fontSize: FontSize.sm, fontWeight: '600' },
  // Wallet chip
  walletChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: BorderRadius.md, borderWidth: 1.5,
  },
  walletChipName: { fontSize: FontSize.sm, fontWeight: '600' },
  walletChipBalance: { fontSize: FontSize.xs },
  // Fields
  fieldLabel: { fontSize: FontSize.xs, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputBox: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  inputText: { fontSize: FontSize.md },
  amountInput: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: BorderRadius.md,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  amountPrefix: { fontSize: FontSize.md, marginRight: 6 },
  amountField: { flex: 1, fontSize: FontSize.lg, fontWeight: '700' },
  // Icon & Color pickers
  iconOpt: { width: 44, height: 44, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff', ...Shadow.sm },
  // Error & Submit
  errorText: { color: Colors.expense, fontSize: FontSize.xs, marginBottom: 8, textAlign: 'center' },
  submitBtn: { paddingVertical: 14, borderRadius: BorderRadius.lg, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});
