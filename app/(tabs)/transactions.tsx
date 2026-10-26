// Add Transaction screen for Keobi
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Modal, Platform, Alert, KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useWalletStore } from '../../src/store/useWalletStore';
import { useCategoryStore } from '../../src/store/useCategoryStore';
import { useTransactionStore } from '../../src/store/useTransactionStore';
import { useTheme } from '../../src/hooks/useTheme';
import { Colors, BorderRadius, FontSize, Shadow } from '../../src/constants/Colors';
import { formatCurrency, formatDate, hexToRgba, generateId } from '../../src/utils/helpers';
import { Category, Wallet } from '../../src/types';
import * as Haptics from 'expo-haptics';
import { useTranslation } from '../../src/hooks/useTranslation';

type TransactionMode = 'expense' | 'income';



// ── Category Picker Modal ────────────────────────────────────────────────────
function CategoryModal({
  visible, onClose, categories, selectedId, onSelect,
}: {
  visible: boolean; onClose: () => void;
  categories: Category[]; selectedId: string | null;
  onSelect: (cat: Category) => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: colors.text }]}>{t.selectCategory}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.categoryGrid}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryItem,
                    { backgroundColor: hexToRgba(cat.color, 0.12) },
                    selectedId === cat.id && { borderWidth: 2, borderColor: cat.color },
                  ]}
                  onPress={() => { onSelect(cat); onClose(); }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.catIconCircle, { backgroundColor: hexToRgba(cat.color, 0.2) }]}>
                    <Ionicons name={(cat.icon as any) || 'pricetag'} size={20} color={cat.color} />
                  </View>
                  <Text style={[styles.catName, { color: colors.text }]} numberOfLines={2}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Wallet Picker Modal ──────────────────────────────────────────────────────
function WalletModal({
  visible, onClose, wallets, selectedId, onSelect,
}: {
  visible: boolean; onClose: () => void;
  wallets: Wallet[]; selectedId: string | null;
  onSelect: (wallet: Wallet) => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: colors.text }]}>{t.selectWallet}</Text>
          {wallets.map(wallet => (
            <TouchableOpacity
              key={wallet.id}
              style={[
                styles.walletOption,
                { borderColor: colors.border },
                selectedId === wallet.id && { borderColor: wallet.color, backgroundColor: hexToRgba(wallet.color, 0.08) },
              ]}
              onPress={() => { onSelect(wallet); onClose(); }}
              activeOpacity={0.8}
            >
              <View style={[styles.walletOptionIcon, { backgroundColor: hexToRgba(wallet.color, 0.15) }]}>
                <Ionicons name={(wallet.icon === 'bank' ? 'business' : (wallet.icon || 'wallet')) as any} size={22} color={wallet.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.walletOptionName, { color: colors.text }]}>{wallet.name}</Text>
                <Text style={[styles.walletOptionBalance, { color: wallet.color }]}>
                  {formatCurrency(wallet.balance)}
                </Text>
              </View>
              {selectedId === wallet.id && (
                <Ionicons name="checkmark-circle" size={22} color={wallet.color} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function TransactionScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { wallets } = useWalletStore();
  const { getCategoriesByType } = useCategoryStore();
  const { addTransaction } = useTransactionStore();

  const [mode, setMode] = useState<TransactionMode>('expense');
  const [amountStr, setAmountStr] = useState('0');
  const [note, setNote] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(wallets[0]?.id || null);
  const selectedWallet = wallets.find(w => w.id === selectedWalletId) || null;
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  useEffect(() => {
    if (!selectedWalletId && wallets.length > 0) {
      setSelectedWalletId(wallets[0].id);
    }
  }, [wallets, selectedWalletId]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const amountInputRef = useRef<any>(null);

  const categories = getCategoriesByType(mode);
  const amount = parseInt(amountStr.replace(/\D/g, ''), 10) || 0;

  const handleAmountChange = (text: string) => {
    const cleanNumber = text.replace(/\D/g, '').slice(0, 16);
    setAmountStr(cleanNumber || '0');
  };

  const formattedAmount = amount > 0 ? amount.toLocaleString('id-ID') : '';
  const getAmountFontSize = () => {
    const len = formattedAmount.length || 1;
    if (len >= 16) return 20;
    if (len >= 13) return 23;
    if (len >= 10) return 27;
    if (len >= 7) return 31;
    return 36;
  };
  const amountFontSize = getAmountFontSize();

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (amount <= 0) { Alert.alert('Error', t.amountInvalid); return; }
    if (!selectedWallet) { Alert.alert('Error', t.selectWalletFirst); return; }
    
    if (mode === 'expense' && amount > selectedWallet.balance) {
      Alert.alert(t.insufficientBalance, t.insufficientBalanceMsg);
      return;
    }

    setIsSubmitting(true);
    try {
      await addTransaction({
        wallet_id: selectedWallet.id,
        category_id: selectedCategory?.id || null,
        type: mode,
        amount,
        note,
        date: selectedDate.getTime(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Reset form
      setAmountStr('0');
      setNote('');
      setSelectedCategory(null);
      setSelectedDate(new Date());
      Alert.alert('Berhasil', t.txnSuccessMsg);
    } catch (e: any) {
      Alert.alert('Error', t.saveFailedMsg + ': ' + (e?.message || String(e)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isIncome = mode === 'income';
  const modeColor = isIncome ? Colors.income : Colors.expense;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.addTxn}</Text>
      </View>

      {/* Mode Toggle */}
      <View style={[styles.modeToggleContainer, { backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9' }]}>
        {(['expense', 'income'] as TransactionMode[]).map(m => {
          const isActive = mode === m;
          const isInc = m === 'income';
          return (
            <TouchableOpacity
              key={m}
              style={[
                styles.modeBtn,
                isActive && [
                  styles.modeBtnActive,
                  { backgroundColor: colors.surface, ...Shadow.sm },
                ],
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setMode(m);
                setSelectedCategory(null);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isInc ? 'arrow-down-circle' : 'arrow-up-circle'}
                size={18}
                color={isActive ? (isInc ? Colors.income : Colors.expense) : colors.textMuted}
              />
              <Text style={[
                styles.modeBtnText,
                { color: isActive ? (isInc ? Colors.incomeDark : Colors.expenseDark) : colors.textSecondary },
                isActive && { fontWeight: '700' },
              ]}>
                {isInc ? t.income : t.expense}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Amount Section */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => amountInputRef.current?.focus()}
          style={[
            styles.amountCard,
            {
              backgroundColor: colors.surface,
              borderColor: isDark ? colors.border : '#E2E8F0',
              borderWidth: isDark ? 1 : 0,
            },
          ]}
        >
          <Text style={[styles.amountHeader, { color: colors.textMuted }]}>{t.txnAmountTitle}</Text>
          <View style={styles.amountInputRow}>
            <Text
              style={[
                styles.amountPrefix,
                {
                  color: modeColor,
                  fontSize: Math.max(16, Math.round(amountFontSize * 0.65)),
                },
              ]}
            >
              Rp
            </Text>
            <TextInput
              ref={amountInputRef}
              style={[
                styles.amountInput,
                {
                  color: colors.text,
                  fontSize: amountFontSize,
                },
              ]}
              keyboardType="number-pad"
              value={formattedAmount}
              onChangeText={handleAmountChange}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              autoFocus={true}
              selectionColor={modeColor}
              maxLength={19}
            />
          </View>
        </TouchableOpacity>

        {/* Form Fields Card */}
        <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#E2E8F0', borderWidth: isDark ? 1 : 0 }]}>
          {/* Wallet */}
          <TouchableOpacity
            style={[styles.formRow, { borderBottomColor: colors.borderSubtle || colors.border }]}
            onPress={() => setShowWalletModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.formIconContainer, { backgroundColor: Colors.primaryTint }]}>
              <Ionicons name="wallet-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{t.wallet}</Text>
            <View style={styles.formValue}>
              {selectedWallet ? (
                <>
                  <View style={[styles.walletDot, { backgroundColor: selectedWallet.color }]} />
                  <Text style={[styles.formValueText, { color: colors.text }]}>{selectedWallet.name}</Text>
                </>
              ) : (
                <Text style={[styles.formPlaceholder, { color: colors.textMuted }]}>{t.selectWallet}</Text>
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Category */}
          <TouchableOpacity
            style={[styles.formRow, { borderBottomColor: colors.borderSubtle || colors.border }]}
            onPress={() => setShowCategoryModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.formIconContainer, { backgroundColor: Colors.primaryTint }]}>
              <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{t.category}</Text>
            <View style={styles.formValue}>
              {selectedCategory ? (
                <>
                  <View style={[styles.walletDot, { backgroundColor: selectedCategory.color }]} />
                  <Text style={[styles.formValueText, { color: colors.text }]}>{selectedCategory.name}</Text>
                </>
              ) : (
                <Text style={[styles.formPlaceholder, { color: colors.textMuted }]}>{t.selectCategory}</Text>
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Date */}
          <TouchableOpacity
            style={[styles.formRow, { borderBottomColor: colors.borderSubtle || colors.border }]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.formIconContainer, { backgroundColor: Colors.primaryTint }]}>
              <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{t.date}</Text>
            <View style={styles.formValue}>
              <Text style={[styles.formValueText, { color: colors.text }]}>
                {formatDate(selectedDate.getTime(), 'dd MMMM yyyy')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Note */}
          <View style={[styles.formRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.formIconContainer, { backgroundColor: Colors.primaryTint }]}>
              <Ionicons name="create-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{t.note}</Text>
            <TextInput
              style={[styles.noteInput, { color: colors.text }]}
              placeholder={t.noNote}
              placeholderTextColor={colors.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: modeColor }, isSubmitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.88}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.submitText}>
            {isSubmitting ? t.saving : (isIncome ? t.saveIncome : t.saveExpense)}
          </Text>
        </TouchableOpacity>
        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>

      {/* Modals */}
      <CategoryModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        categories={categories}
        selectedId={selectedCategory?.id || null}
        onSelect={setSelectedCategory}
      />
      <WalletModal
        visible={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        wallets={wallets}
        selectedId={selectedWalletId}
        onSelect={(wallet) => setSelectedWalletId(wallet.id)}
      />
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', letterSpacing: -0.5 },
  modeToggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: BorderRadius.lg,
    padding: 3,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  modeBtnActive: {},
  modeBtnText: { fontSize: FontSize.sm, fontWeight: '600' },
  amountCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    ...Shadow.sm,
  },
  amountHeader: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
    paddingHorizontal: 8,
  },
  amountPrefix: {
    fontWeight: '800',
    marginRight: 6,
  },
  amountInput: {
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'left',
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    flexShrink: 1,
  },
  formCard: {
    marginHorizontal: 20,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: 20,
    ...Shadow.sm,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  formIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formLabel: { fontSize: FontSize.sm, fontWeight: '500', width: 75 },
  formValue: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  formValueText: { fontSize: FontSize.sm, fontWeight: '600' },
  formPlaceholder: { fontSize: FontSize.sm },
  walletDot: { width: 8, height: 8, borderRadius: 4 },
  noteInput: { flex: 1, fontSize: FontSize.sm, textAlign: 'right', minHeight: 20 },
  submitBtn: {
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadow.sm,
  },
  submitText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700', letterSpacing: -0.2 },
  // Modals
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%',
    borderTopWidth: 1, borderColor: '#E2E8F0',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1',
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: 16, letterSpacing: -0.3 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 24 },
  categoryItem: {
    width: '30%', alignItems: 'center', padding: 12,
    borderRadius: BorderRadius.lg, gap: 8,
  },
  catIconCircle: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  catName: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  walletOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: 10,
  },
  walletOptionIcon: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  walletOptionName: { fontSize: FontSize.sm, fontWeight: '600' },
  walletOptionBalance: { fontSize: FontSize.xs, marginTop: 2 },
});
