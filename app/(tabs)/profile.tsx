// Profile & Settings screen for Keobi
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, Switch, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { useWalletStore } from '../../src/store/useWalletStore';
import { useCategoryStore } from '../../src/store/useCategoryStore';
import { useTransactionStore } from '../../src/store/useTransactionStore';
import { useTheme } from '../../src/hooks/useTheme';
import { Colors, BorderRadius, FontSize, Shadow } from '../../src/constants/Colors';
import { formatCurrency, generateId, hashPin, verifyPin, hexToRgba } from '../../src/utils/helpers';
import { Wallet, Category } from '../../src/types';
import { exportToCSV, exportToHTML, backupDatabase, restoreDatabase } from '../../src/utils/export';
import { resetDatabaseForNewUser, deleteUserAccount } from '../../src/db/database';
import { router } from 'expo-router';

const WALLET_ICONS = ['wallet', 'card', 'cash', 'business', 'briefcase', 'storefront', 'phone-portrait', 'logo-bitcoin'];
const WALLET_COLORS = ['#1A6FE8', '#22C55E', '#EF4444', '#F5C842', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6'];
const CAT_ICONS = ['briefcase', 'restaurant', 'car', 'bag', 'receipt', 'medical', 'game-controller', 'sparkles', 'fast-food', 'school', 'laptop', 'gift', 'home', 'fitness', 'pricetag'];

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>{title.toUpperCase()}</Text>;
}

// ── Settings Row ─────────────────────────────────────────────────────────────
function SettingsRow({
  icon, iconColor = Colors.primary, label, value, onPress, rightEl, subtitle,
}: {
  icon: string; iconColor?: string; label: string; value?: string;
  onPress?: () => void; rightEl?: React.ReactNode; subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.settingsRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingsIcon, { backgroundColor: hexToRgba(iconColor, 0.12) }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingsLabel, { color: colors.text }]}>{label}</Text>
        {subtitle && <Text style={[styles.settingsSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
      </View>
      {rightEl || (
        value ? <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>{value}</Text> : null
      )}
      {onPress && !rightEl && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />}
    </TouchableOpacity>
  );
}

// ── Wallet Form Modal ─────────────────────────────────────────────────────────
function WalletModal({
  visible, onClose, onSave, initial,
}: {
  visible: boolean; onClose: () => void;
  onSave: (data: Omit<Wallet, 'id' | 'created_at' | 'updated_at'>) => void;
  initial?: Wallet;
}) {
  const { colors } = useTheme();
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
    if (!name.trim()) { Alert.alert('Error', 'Nama dompet wajib diisi'); return; }
    onSave({ name: name.trim(), icon, color, balance: parseFloat(balance) || 0 });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {initial ? 'Edit Dompet' : 'Tambah Dompet'}
          </Text>

          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.inputBorder }]}
            placeholder="Nama dompet"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.inputBorder }]}
            placeholder="Saldo awal (Rp)"
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
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: Colors.primary }]} onPress={handleSave}>
              <Text style={styles.saveText}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Category Form Modal ───────────────────────────────────────────────────────
function CategoryModal({
  visible, onClose, onSave, initial,
}: {
  visible: boolean; onClose: () => void;
  onSave: (data: Omit<Category, 'id' | 'created_at' | 'is_default'>) => void;
  initial?: Category;
}) {
  const { colors } = useTheme();
  const [name, setName] = useState(initial?.name || '');
  const [icon, setIcon] = useState(initial?.icon || 'pricetag');
  const [color, setColor] = useState(initial?.color || Colors.primary);
  const [type, setType] = useState<'income' | 'expense' | 'both'>(initial?.type || 'expense');

  React.useEffect(() => {
    if (visible) {
      setName(initial?.name || '');
      setIcon(initial?.icon || 'pricetag');
      setColor(initial?.color || Colors.primary);
      setType(initial?.type || 'expense');
    }
  }, [visible, initial]);

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Error', 'Nama kategori wajib diisi'); return; }
    onSave({ name: name.trim(), icon, color, type });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {initial ? 'Edit Kategori' : 'Tambah Kategori'}
          </Text>

          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.inputBorder }]}
            placeholder="Nama kategori"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Tipe</Text>
          <View style={styles.typeRow}>
            {(['income', 'expense', 'both'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, { borderColor: type === t ? color : colors.border },
                  type === t && { backgroundColor: hexToRgba(color, 0.15) }]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.typeText, { color: type === t ? color : colors.textMuted }]}>
                  {t === 'income' ? 'Pemasukan' : t === 'expense' ? 'Pengeluaran' : 'Keduanya'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Ikon</Text>
          <View style={styles.iconGrid}>
            {CAT_ICONS.map(ic => (
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
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: Colors.primary }]} onPress={handleSave}>
              <Text style={styles.saveText}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── PIN Change Modal ─────────────────────────────────────────────────────────
function PinModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const { pin_hash, setSetting } = useSettingsStore();
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('new');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const hasPinSet = !!pin_hash;

  React.useEffect(() => {
    if (visible) {
      setStep(hasPinSet ? 'current' : 'new');
      setCurrentPin(''); setNewPin(''); setConfirmPin('');
    }
  }, [visible]);

  const handleNext = async () => {
    if (step === 'current') {
      const valid = await verifyPin(currentPin, pin_hash);
      if (!valid) { Alert.alert('Error', 'PIN saat ini salah'); return; }
      setStep('new');
    } else if (step === 'new') {
      if (newPin.length !== 6) { Alert.alert('Error', 'PIN harus tepat 6 angka'); return; }
      setStep('confirm');
    } else {
      if (confirmPin !== newPin) { Alert.alert('Error', 'PIN tidak cocok'); return; }
      const hash = await hashPin(newPin);
      await setSetting('pin_hash', hash);
      await setSetting('pin_enabled', true);
      Alert.alert('✅ Berhasil', 'PIN berhasil diperbarui');
      onClose();
    }
  };

  const labels = {
    current: 'Masukkan PIN saat ini',
    new: 'Buat PIN baru (6 digit)',
    confirm: 'Konfirmasi PIN baru',
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: colors.text }]}>Ubah PIN</Text>
          <Text style={[styles.pinLabel, { color: colors.textSecondary }]}>{labels[step]}</Text>
          <TextInput
            style={[styles.pinInput, { color: colors.text, backgroundColor: colors.input, borderColor: Colors.primary }]}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            value={step === 'current' ? currentPin : step === 'new' ? newPin : confirmPin}
            onChangeText={step === 'current' ? setCurrentPin : step === 'new' ? setNewPin : setConfirmPin}
            placeholder="••••••"
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: Colors.primary }]} onPress={handleNext}>
              <Text style={styles.saveText}>{step === 'confirm' ? 'Simpan' : 'Lanjut'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Profile Screen ───────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile_name, dark_mode, pin_enabled, biometric_enabled, setSetting, toggleDarkMode, loadSettings, login_email } = useSettingsStore();
  const { wallets, addWallet, updateWallet, deleteWallet, loadWallets } = useWalletStore();
  const { categories, addCategory, updateCategory, deleteCategory, loadCategories } = useCategoryStore();
  const { loadTransactions, loadMonthSummary } = useTransactionStore();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile_name);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | undefined>();
  const [editingCat, setEditingCat] = useState<Category | undefined>();
  const [expandWallets, setExpandWallets] = useState(false);
  const [expandCats, setExpandCats] = useState(false);

  const handleExportCSV = async () => {
    try {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
      const endOfYear = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59).getTime();
      await exportToCSV(startOfYear, endOfYear, 'Semua_Transaksi');
    } catch (e: any) {
      Alert.alert('Gagal Ekspor', e.message || 'Terjadi kesalahan');
    }
  };

  const handleExportHTML = async () => {
    try {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
      const endOfYear = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59).getTime();
      await exportToHTML(startOfYear, endOfYear, 'Semua_Transaksi');
    } catch (e: any) {
      Alert.alert('Gagal Ekspor', e.message || 'Terjadi kesalahan');
    }
  };

  const handleBackup = async () => {
    try {
      await backupDatabase();
    } catch (e: any) {
      Alert.alert('Gagal Backup', e.message || 'Terjadi kesalahan');
    }
  };

  const handleRestore = async () => {
    Alert.alert(
      '⚠️ Pemulihan Data',
      'Memulihkan data akan menghapus seluruh data Anda saat ini dan menggantinya dengan data dari file cadangan. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Pulihkan',
          style: 'destructive',
          onPress: async () => {
            try {
              await restoreDatabase();
              
              // Sync stores with the new database data
              await Promise.all([
                loadSettings(),
                loadWallets(),
                loadCategories(),
                loadTransactions(true),
                loadMonthSummary(),
              ]);

              Alert.alert('✅ Berhasil', 'Data Anda berhasil dipulihkan dan disinkronisasikan!');
            } catch (e: any) {
              Alert.alert('Gagal Restore', e.message || 'Terjadi kesalahan');
            }
          },
        },
      ]
    );
  };

  const saveName = async () => {
    if (nameInput.trim()) await setSetting('profile_name', nameInput.trim());
    setEditingName(false);
  };

  const handleDeleteWallet = (wallet: Wallet) => {
    Alert.alert(
      'Hapus Dompet',
      `Yakin hapus "${wallet.name}"? Semua transaksi di dompet ini juga akan terhapus.`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus', style: 'destructive', onPress: () => deleteWallet(wallet.id) },
      ]
    );
  };

  const handleDeleteCat = (cat: Category) => {
    if (cat.is_default) { Alert.alert('Info', 'Kategori bawaan tidak dapat dihapus'); return; }
    Alert.alert('Hapus Kategori', `Yakin hapus "${cat.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => deleteCategory(cat.id) },
    ]);
  };

  const userCategories = categories.filter(c => !c.is_default);
  const displayCats = expandCats ? categories : categories.slice(0, 5);
  const displayWallets = expandWallets ? wallets : wallets.slice(0, 3);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profil</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: Colors.primary }]}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {(profile_name || 'P')[0].toUpperCase()}
            </Text>
          </View>
          {editingName ? (
            <View style={styles.nameEdit}>
              <TextInput
                style={[styles.nameInput, { color: '#fff', borderBottomColor: 'rgba(255,255,255,0.5)' }]}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                onBlur={saveName}
                onSubmitEditing={saveName}
                selectionColor={Colors.accent}
              />
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingName(true)}>
              <Text style={styles.profileName}>{profile_name}</Text>
              <Text style={styles.profileSubtitle}>Ketuk untuk ubah nama ✏️</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Preferences */}
        <SectionHeader title="Preferensi" />
        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          <SettingsRow
            icon="moon"
            iconColor="#8B5CF6"
            label="Mode Gelap"
            rightEl={
              <Switch
                value={dark_mode}
                onValueChange={toggleDarkMode}
                trackColor={{ false: colors.border, true: Colors.primary }}
                thumbColor="#fff"
              />
            }
          />
          <SettingsRow
            icon="lock-closed"
            iconColor={Colors.primary}
            label="PIN Keamanan"
            subtitle={pin_enabled ? 'Aktif' : 'Nonaktif'}
            onPress={() => setShowPinModal(true)}
          />
          <SettingsRow
            icon="finger-print"
            iconColor={Colors.income}
            label="Sidik Jari"
            rightEl={
              <Switch
                value={biometric_enabled}
                onValueChange={v => setSetting('biometric_enabled', v)}
                trackColor={{ false: colors.border, true: Colors.income }}
                thumbColor="#fff"
              />
            }
          />
          <SettingsRow
            icon="log-out"
            iconColor={Colors.expense}
            label="Keluar (Log Out)"
            subtitle="Keluar dan akhiri sesi login akun"
            onPress={() => {
              Alert.alert('Keluar', 'Apakah Anda yakin ingin keluar dari akun?', [
                { text: 'Batal', style: 'cancel' },
                {
                  text: 'Keluar',
                  style: 'destructive',
                  onPress: async () => {
                    await setSetting('session_active', false);
                    router.replace('/login' as any);
                  },
                },
              ]);
            }}
          />
          <SettingsRow
            icon="trash-bin"
            iconColor="#EF4444"
            label="Hapus Akun Permanen"
            subtitle="Hapus seluruh data akun secara permanen"
            onPress={() => {
              Alert.alert(
                '⚠️ Hapus Akun',
                'Apakah Anda yakin ingin menghapus akun secara permanen? Seluruh data transaksi, dompet, kategori, dan preferensi akan dihapus selamanya.',
                [
                  { text: 'Batal', style: 'cancel' },
                  {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: () => {
                      Alert.alert(
                        '❗ Konfirmasi Terakhir',
                        'Tindakan ini tidak dapat dibatalkan. Seluruh data Anda akan hilang selamanya. Lanjutkan?',
                        [
                          { text: 'Batal', style: 'cancel' },
                          {
                            text: 'Ya, Hapus Akun',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                if (login_email) {
                                  await deleteUserAccount(login_email);
                                }
                                await setSetting('login_email', '');
                                await setSetting('session_active', false);
                                await Promise.all([
                                  loadSettings(),
                                  loadWallets(),
                                  loadCategories(),
                                  loadTransactions(true),
                                  loadMonthSummary(),
                                ]);
                                Alert.alert('✅ Akun Dihapus', 'Semua data akun Anda berhasil dibersihkan.');
                                router.replace('/login' as any);
                              } catch (e: any) {
                                Alert.alert('Gagal Hapus Akun', e.message || 'Terjadi kesalahan');
                              }
                            }
                          }
                        ]
                      );
                    }
                  }
                ]
              );
            }}
          />
        </View>

        {/* Wallets */}
        <SectionHeader title="Kelola Dompet" />
        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          {displayWallets.map(wallet => (
            <View key={wallet.id} style={[styles.walletRow, { borderBottomColor: colors.border }]}>
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
              <TouchableOpacity onPress={() => handleDeleteWallet(wallet)} style={{ marginLeft: 8 }}>
                <Ionicons name="trash" size={18} color={Colors.expense} />
              </TouchableOpacity>
            </View>
          ))}
          {wallets.length > 3 && (
            <TouchableOpacity onPress={() => setExpandWallets(e => !e)} style={styles.expandBtn}>
              <Text style={[styles.expandText, { color: Colors.primary }]}>
                {expandWallets ? 'Tampilkan lebih sedikit' : `Lihat ${wallets.length - 3} lainnya`}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.addItemBtn, { borderColor: Colors.primary }]}
            onPress={() => { setEditingWallet(undefined); setShowWalletModal(true); }}
          >
            <Ionicons name="add" size={18} color={Colors.primary} />
            <Text style={[styles.addItemText, { color: Colors.primary }]}>Tambah Dompet</Text>
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <SectionHeader title="Kelola Kategori" />
        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          {displayCats.map(cat => (
            <View key={cat.id} style={[styles.catRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.catRowIcon, { backgroundColor: hexToRgba(cat.color, 0.15) }]}>
                <Ionicons name={cat.icon as any} size={18} color={cat.color} />
              </View>
              <Text style={[styles.catRowName, { color: colors.text }]} numberOfLines={1}>{cat.name}</Text>
              <View style={[styles.catTypeBadge, { backgroundColor: hexToRgba(
                cat.type === 'income' ? Colors.income : cat.type === 'expense' ? Colors.expense : Colors.primary, 0.15
              )}]}>
                <Text style={[styles.catTypeText, { color: cat.type === 'income' ? Colors.income : cat.type === 'expense' ? Colors.expense : Colors.primary }]}>
                  {cat.type === 'income' ? 'Masuk' : cat.type === 'expense' ? 'Keluar' : 'Keduanya'}
                </Text>
              </View>
              {!cat.is_default && (
                <>
                  <TouchableOpacity onPress={() => { setEditingCat(cat); setShowCatModal(true); }}>
                    <Ionicons name="pencil" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteCat(cat)} style={{ marginLeft: 8 }}>
                    <Ionicons name="trash" size={16} color={Colors.expense} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          ))}
          {categories.length > 5 && (
            <TouchableOpacity onPress={() => setExpandCats(e => !e)} style={styles.expandBtn}>
              <Text style={[styles.expandText, { color: Colors.primary }]}>
                {expandCats ? 'Tampilkan lebih sedikit' : `Lihat ${categories.length - 5} lainnya`}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.addItemBtn, { borderColor: Colors.primary }]}
            onPress={() => { setEditingCat(undefined); setShowCatModal(true); }}
          >
            <Ionicons name="add" size={18} color={Colors.primary} />
            <Text style={[styles.addItemText, { color: Colors.primary }]}>Tambah Kategori</Text>
          </TouchableOpacity>
        </View>

        {/* Backup & Restore */}
        <SectionHeader title="Ekspor & Cadangkan Data" />
        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          <SettingsRow
            icon="document-text"
            iconColor={Colors.primary}
            label="Ekspor Laporan CSV"
            subtitle="Ekspor riwayat transaksi ke file CSV"
            onPress={handleExportCSV}
          />
          <SettingsRow
            icon="code-working"
            iconColor={Colors.accent}
            label="Ekspor Laporan HTML"
            subtitle="Ekspor laporan siap print"
            onPress={handleExportHTML}
          />
          <SettingsRow
            icon="cloud-upload"
            iconColor={Colors.income}
            label="Cadangkan Data (Backup JSON)"
            subtitle="Simpan data ke file JSON"
            onPress={handleBackup}
          />
          <SettingsRow
            icon="cloud-download"
            iconColor="#8B5CF6"
            label="Puluhkan Data (Restore JSON)"
            subtitle="Restore data dari file backup"
            onPress={handleRestore}
          />
        </View>

        {/* About */}
        <SectionHeader title="Tentang Aplikasi" />
        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          <SettingsRow icon="information-circle" iconColor={Colors.primary} label="Versi Keobi" value="1.0.0" />
          <SettingsRow icon="heart" iconColor={Colors.expense} label="Dibuat dengan ❤️" value="2024" />
        </View>
      </ScrollView>

      <WalletModal
        visible={showWalletModal}
        onClose={() => { setShowWalletModal(false); setEditingWallet(undefined); }}
        initial={editingWallet}
        onSave={data => editingWallet ? updateWallet(editingWallet.id, data) : addWallet(data)}
      />
      <CategoryModal
        visible={showCatModal}
        onClose={() => { setShowCatModal(false); setEditingCat(undefined); }}
        initial={editingCat}
        onSave={data => editingCat ? updateCategory(editingCat.id, data) : addCategory(data)}
      />
      <PinModal visible={showPinModal} onClose={() => setShowPinModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800' },
  profileCard: {
    marginHorizontal: 20, borderRadius: BorderRadius.xl, padding: 24,
    alignItems: 'center', gap: 8, marginBottom: 24,
    overflow: 'hidden',
  },
  profileAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  profileAvatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  nameEdit: { width: '100%', alignItems: 'center' },
  nameInput: {
    fontSize: FontSize.xl, fontWeight: '700', textAlign: 'center',
    borderBottomWidth: 1, paddingBottom: 4, width: '80%',
  },
  profileName: { color: '#fff', fontSize: FontSize.xl, fontWeight: '700', textAlign: 'center' },
  profileSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm, textAlign: 'center', marginTop: 2 },
  sectionHeader: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1,
    paddingHorizontal: 20, marginBottom: 8, marginTop: 8,
  },
  settingsCard: { marginHorizontal: 20, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 8 },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  settingsLabel: { fontSize: FontSize.md, fontWeight: '600' },
  settingsSubtitle: { fontSize: 12, marginTop: 1 },
  settingsValue: { fontSize: FontSize.sm },
  // Wallet rows
  walletRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  walletRowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  walletRowName: { fontSize: FontSize.sm, fontWeight: '600' },
  walletRowBalance: { fontSize: 12, marginTop: 2 },
  expandBtn: { paddingVertical: 12, alignItems: 'center' },
  expandText: { fontSize: FontSize.sm, fontWeight: '600' },
  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, margin: 12, paddingVertical: 12, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderStyle: 'dashed',
  },
  addItemText: { fontSize: FontSize.sm, fontWeight: '700' },
  // Category rows
  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catRowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  catRowName: { flex: 1, fontSize: FontSize.sm, fontWeight: '600' },
  catTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catTypeText: { fontSize: 11, fontWeight: '600' },
  // Modals
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
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.md, borderWidth: 1.5 },
  typeText: { fontSize: 12, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg, borderWidth: 1.5, alignItems: 'center' },
  cancelText: { fontSize: FontSize.md, fontWeight: '600' },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: BorderRadius.lg, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  pinLabel: { fontSize: FontSize.md, marginBottom: 12 },
  pinInput: {
    borderWidth: 2, borderRadius: BorderRadius.lg, padding: 16,
    fontSize: 24, textAlign: 'center', letterSpacing: 8, marginBottom: 20,
  },
});
