import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWalletStore } from '../src/store/useWalletStore';
import { useTheme } from '../src/hooks/useTheme';
import { Colors, BorderRadius, FontSize, Shadow } from '../src/constants/Colors';
import { formatCurrency, hexToRgba } from '../src/utils/helpers';
import { Wallet } from '../src/types';
import { router } from 'expo-router';
import { useTranslation } from '../src/hooks/useTranslation';

const WALLET_ICONS = ['wallet', 'card', 'cash', 'business', 'briefcase', 'storefront', 'phone-portrait', 'logo-bitcoin'];
const WALLET_COLORS = ['#1A6FE8', '#22C55E', '#EF4444', '#F5C842', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6'];

// ── Wallet Form Modal ─────────────────────────────────────────────────────────
function WalletModal({
  visible, onClose, onSave, initial,
}: {
  visible: boolean; onClose: () => void;
  onSave: (data: Omit<Wallet, 'id' | 'created_at' | 'updated_at'>) => void;
  initial?: Wallet;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name || '');
  const [balance, setBalance] = useState(String(initial?.balance || ''));
  const [icon, setIcon] = useState(initial?.icon || 'wallet');
  const [color, setColor] = useState(initial?.color || Colors.primary);

  React.useEffect(() => {
    if (visible) {
      setName(initial?.name || '');
      setBalance(String(initial?.balance || ''));
      setIcon(initial?.icon === 'bank' ? 'business' : (initial?.icon || 'wallet'));
      setColor(initial?.color || Colors.primary);
    }
  }, [visible, initial]);

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Error', t.nameWalletRequired); return; }
    onSave({ name: name.trim(), icon, color, balance: parseFloat(balance) || 0 });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {initial ? t.editWallet : t.addWallet}
          </Text>

          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.inputBorder }]}
            placeholder={t.placeholderWalletName}
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.inputBorder }]}
            placeholder={t.placeholderInitialBalance}
            placeholderTextColor={colors.textMuted}
            value={balance}
            onChangeText={setBalance}
            keyboardType="numeric"
          />

          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Ikon</Text>
          <View style={styles.iconGrid}>
            {WALLET_ICONS.map(ic => (
              <TouchableOpacity
                key={ic}
                style={[styles.iconOption, { borderColor: icon === ic ? color : colors.border },
                  icon === ic && { backgroundColor: hexToRgba(color, 0.15) }]}
                onPress={() => setIcon(ic)}
              >
                <Ionicons name={ic as any} size={22} color={icon === ic ? color : colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Warna</Text>
          <View style={styles.colorRow}>
            {WALLET_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: Colors.primary }]} onPress={handleSave}>
              <Text style={styles.saveText}>{t.save}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Wallet Manager Screen ────────────────────────────────────────────────────
export default function WalletManagerScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { wallets, addWallet, updateWallet, deleteWallet } = useWalletStore();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | undefined>();

  const handleDeleteWallet = (wallet: Wallet) => {
    Alert.alert(
      t.deleteWalletTitle,
      t.deleteWalletConfirm.replace('{name}', wallet.name),
      [
        { text: t.cancel, style: 'cancel' },
        { text: t.delete, style: 'destructive', onPress: () => deleteWallet(wallet.id) },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.manageWalletTitle}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface, marginTop: 16 }]}>
          {wallets.map((wallet, idx) => (
            <View key={wallet.id} style={[styles.walletRow, { borderBottomColor: colors.border }, idx === wallets.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[styles.walletRowIcon, { backgroundColor: hexToRgba(wallet.color, 0.15) }]}>
                <Ionicons name={(wallet.icon === 'bank' ? 'business' : wallet.icon) as any} size={20} color={wallet.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.walletRowName, { color: colors.text }]}>{wallet.name}</Text>
                <Text style={[styles.walletRowBalance, { color: wallet.color }]}>
                  {formatCurrency(wallet.balance)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setEditingWallet(wallet); setShowWalletModal(true); }}>
                <Ionicons name="pencil" size={18} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteWallet(wallet)} style={{ marginLeft: 12 }}>
                <Ionicons name="trash" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.addItemBtn, { borderColor: Colors.primary, marginTop: 24 }]}
          onPress={() => { setEditingWallet(undefined); setShowWalletModal(true); }}
        >
          <Ionicons name="add" size={18} color={Colors.primary} />
          <Text style={[styles.addItemText, { color: Colors.primary }]}>{t.addWallet}</Text>
        </TouchableOpacity>
      </ScrollView>

      <WalletModal
        visible={showWalletModal}
        onClose={() => { setShowWalletModal(false); setEditingWallet(undefined); }}
        initial={editingWallet}
        onSave={data => editingWallet ? updateWallet(editingWallet.id, data) : addWallet(data)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    paddingRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', flex: 1 },
  settingsCard: { marginHorizontal: 20, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 8 },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  walletRowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  walletRowName: { fontSize: FontSize.sm, fontWeight: '600' },
  walletRowBalance: { fontSize: 12, marginTop: 2 },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 20,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addItemText: { fontSize: FontSize.sm, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', marginBottom: 16 },
  input: {
    borderWidth: 1, borderRadius: BorderRadius.md, padding: 14,
    fontSize: FontSize.md, marginBottom: 12,
  },
  pickerLabel: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  iconOption: {
    width: 48, height: 48, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.15 }] },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg, borderWidth: 1.5, alignItems: 'center' },
  cancelText: { fontSize: FontSize.md, fontWeight: '600' },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: BorderRadius.lg, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});
