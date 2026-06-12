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

type TransactionMode = 'expense' | 'income';

// ── Amount Keypad ────────────────────────────────────────────────────────────
function Keypad({ onKey, disabled }: { onKey: (key: string) => void; disabled?: boolean }) {
  const { colors } = useTheme();
  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', '⌫'],
  ];

  return (
    <View style={styles.keypad}>
      {rows.map((row, rIdx) => (
        <View key={rIdx} style={styles.keypadRow}>
          {row.map(key => (
            <TouchableOpacity
              key={key}
              style={[styles.keyBtn, { backgroundColor: colors.surfaceSecondary }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onKey(key); }}
              activeOpacity={0.7}
              disabled={disabled}
            >
              {key === '⌫'
                ? <Ionicons name="backspace" size={22} color={colors.text} />
                : <Text style={[styles.keyText, { color: colors.text }]}>{key}</Text>
              }
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Category Picker Modal ────────────────────────────────────────────────────
function CategoryModal({
  visible, onClose, categories, selectedId, onSelect,
}: {
  visible: boolean; onClose: () => void;
  categories: Category[]; selectedId: string | null;
  onSelect: (cat: Category) => void;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: colors.text }]}>Pilih Kategori</Text>
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
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: colors.text }]}>Pilih Dompet</Text>
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

  const categories = getCategoriesByType(mode);
  const amount = parseInt(amountStr.replace(/\D/g, ''), 10) || 0;

  const handleKey = useCallback((key: string) => {
    setAmountStr(prev => {
      if (key === '⌫') return prev.length <= 1 ? '0' : prev.slice(0, -1);
      if (key === '.' && prev.includes('.')) return prev;
      if (prev === '0' && key !== '.') return key;
      // Limit to 12 digits (hundreds of billions)
      if (prev.replace(/\D/g, '').length >= 12 && key !== '⌫') return prev;
      return prev + key;
    });
  }, []);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (amount <= 0) { Alert.alert('Error', 'Nominal harus lebih dari 0'); return; }
    if (!selectedWallet) { Alert.alert('Error', 'Pilih dompet terlebih dahulu'); return; }
    
    if (mode === 'expense' && amount > selectedWallet.balance) {
      Alert.alert('Saldo Kurang', 'Saldo dompet tidak mencukupi untuk melakukan pengeluaran ini.');
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
      Alert.alert('✅ Berhasil', `${mode === 'income' ? 'Pemasukan' : 'Pengeluaran'} berhasil dicatat!`);
    } catch (e: any) {
      Alert.alert('Error', 'Gagal menyimpan transaksi: ' + (e?.message || String(e)));
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Tambah Transaksi</Text>
      </View>

      {/* Mode Toggle */}
      <View style={[styles.modeToggleContainer, { backgroundColor: colors.surfaceSecondary }]}>
        {(['expense', 'income'] as TransactionMode[]).map(m => (
          <TouchableOpacity
            key={m}
            style={[
              styles.modeBtn,
              mode === m && {
                backgroundColor: m === 'income' ? Colors.income : Colors.expense,
                ...Shadow.sm,
              },
            ]}
            onPress={() => { setMode(m); setSelectedCategory(null); }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={m === 'income' ? 'arrow-down-circle' : 'arrow-up-circle'}
              size={18}
              color={mode === m ? '#fff' : colors.textMuted}
            />
            <Text style={[
              styles.modeBtnText,
              { color: mode === m ? '#fff' : colors.textMuted },
              mode === m && { fontWeight: '700' },
            ]}>
              {m === 'income' ? 'Pemasukan' : 'Pengeluaran'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Amount Display */}
        <View style={styles.amountContainer}>
          <Text style={[styles.currency, { color: colors.textMuted }]}>Rp</Text>
          <Text style={[styles.amountText, { color: modeColor }]}>
            {parseInt(amountStr || '0', 10).toLocaleString('id-ID')}
          </Text>
        </View>

        {/* Keypad */}
        <Keypad onKey={handleKey} disabled={isSubmitting} />

        {/* Form Fields */}
        <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
          {/* Wallet */}
          <TouchableOpacity
            style={[styles.formRow, { borderBottomColor: colors.border }]}
            onPress={() => setShowWalletModal(true)}
          >
            <Ionicons name="wallet" size={20} color={Colors.primary} />
            <Text style={[styles.formLabel, { color: colors.text }]}>Dompet</Text>
            <View style={styles.formValue}>
              {selectedWallet ? (
                <>
                  <View style={[styles.walletDot, { backgroundColor: selectedWallet.color }]} />
                  <Text style={[styles.formValueText, { color: colors.text }]}>{selectedWallet.name}</Text>
                </>
              ) : (
                <Text style={[styles.formPlaceholder, { color: colors.textMuted }]}>Pilih dompet</Text>
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Category */}
          <TouchableOpacity
            style={[styles.formRow, { borderBottomColor: colors.border }]}
            onPress={() => setShowCategoryModal(true)}
          >
            <Ionicons name="pricetag" size={20} color={Colors.primary} />
            <Text style={[styles.formLabel, { color: colors.text }]}>Kategori</Text>
            <View style={styles.formValue}>
              {selectedCategory ? (
                <>
                  <View style={[styles.walletDot, { backgroundColor: selectedCategory.color }]} />
                  <Text style={[styles.formValueText, { color: colors.text }]}>{selectedCategory.name}</Text>
                </>
              ) : (
                <Text style={[styles.formPlaceholder, { color: colors.textMuted }]}>Pilih kategori</Text>
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Date */}
          <TouchableOpacity
            style={[styles.formRow, { borderBottomColor: colors.border }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={20} color={Colors.primary} />
            <Text style={[styles.formLabel, { color: colors.text }]}>Tanggal</Text>
            <View style={styles.formValue}>
              <Text style={[styles.formValueText, { color: colors.text }]}>
                {formatDate(selectedDate.getTime(), 'dd MMMM yyyy')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Note */}
          <View style={[styles.formRow, { borderBottomWidth: 0 }]}>
            <Ionicons name="create" size={20} color={Colors.primary} />
            <Text style={[styles.formLabel, { color: colors.text }]}>Catatan</Text>
            <TextInput
              style={[styles.noteInput, { color: colors.text }]}
              placeholder="Tambah catatan..."
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
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.submitText}>
            {isSubmitting ? 'Menyimpan...' : `Simpan ${isIncome ? 'Pemasukan' : 'Pengeluaran'}`}
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
          onChange={(_, date) => { setShowDatePicker(false); if (date) setSelectedDate(date); }}
          maximumDate={new Date()}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800' },
  modeToggleContainer: {
    flexDirection: 'row', margin: 20, borderRadius: BorderRadius.lg, padding: 4,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: BorderRadius.md,
  },
  modeBtnText: { fontSize: FontSize.md },
  amountContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, marginBottom: 16, gap: 8,
  },
  currency: { fontSize: FontSize.xl, fontWeight: '600', marginTop: 8 },
  amountText: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  keypad: {
    paddingHorizontal: 24,
    marginBottom: 20,
    alignItems: 'center',
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 280,
    gap: 16,
  },
  keyBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  keyText: { fontSize: 24, fontWeight: '700' },
  formCard: { marginHorizontal: 20, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 16 },
  formRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  formLabel: { fontSize: FontSize.md, fontWeight: '600', width: 80 },
  formValue: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  formValueText: { fontSize: FontSize.md },
  formPlaceholder: { fontSize: FontSize.md },
  walletDot: { width: 8, height: 8, borderRadius: 4 },
  noteInput: { flex: 1, fontSize: FontSize.md, textAlign: 'right', minHeight: 20 },
  submitBtn: {
    marginHorizontal: 20, paddingVertical: 18, borderRadius: BorderRadius.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    ...Shadow.lg,
  },
  submitText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
  // Modals
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc',
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', marginBottom: 16 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 24 },
  categoryItem: {
    width: '30%', alignItems: 'center', padding: 12,
    borderRadius: BorderRadius.md, gap: 8,
  },
  catIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  catName: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  walletOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: BorderRadius.lg, borderWidth: 1.5, marginBottom: 10,
  },
  walletOptionIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  walletOptionName: { fontSize: FontSize.md, fontWeight: '600' },
  walletOptionBalance: { fontSize: FontSize.sm, marginTop: 2 },
});
