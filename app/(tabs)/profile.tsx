// Profile & Settings screen for Keobi
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, Switch, Dimensions, Animated, Image
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { useWalletStore } from '../../src/store/useWalletStore';
import { useCategoryStore } from '../../src/store/useCategoryStore';
import { useTransactionStore } from '../../src/store/useTransactionStore';
import { useTheme } from '../../src/hooks/useTheme';
import { Colors, BorderRadius, FontSize } from '../../src/constants/Colors';
import { hashPin, verifyPin, hexToRgba } from '../../src/utils/helpers';
import * as Haptics from 'expo-haptics';
import { exportToCSV, exportToHTML, backupDatabase, restoreDatabase } from '../../src/utils/export';
import { resetDatabaseForNewUser, deleteUserAccount } from '../../src/db/database';
import { router } from 'expo-router';

const CAT_ICONS = ['briefcase', 'restaurant', 'car', 'bag', 'receipt', 'medical', 'game-controller', 'sparkles', 'fast-food', 'school', 'laptop', 'gift', 'home', 'fitness', 'pricetag'];

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>{title.toUpperCase()}</Text>;
}

// ── Settings Row ─────────────────────────────────────────────────────────────
function SettingsRow({
  icon, iconColor, label, labelColor, value, onPress, rightEl, subtitle, hideDivider,
}: {
  icon: string; iconColor?: string; label: string; labelColor?: string; value?: string;
  onPress?: () => void; rightEl?: React.ReactNode; subtitle?: string; hideDivider?: boolean;
}) {
  const { colors } = useTheme();
  const finalIconColor = iconColor || colors.textSecondary;
  const finalLabelColor = labelColor || colors.text;

  return (
    <TouchableOpacity
      style={[
        styles.settingsRow,
        { borderBottomColor: colors.border },
        hideDivider && { borderBottomWidth: 0 }
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingsIcon}>
        <Ionicons name={icon as any} size={22} color={finalIconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingsLabel, { color: finalLabelColor }]}>{label}</Text>
        {subtitle && <Text style={[styles.settingsSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
      </View>
      {rightEl || (
        value ? <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>{value}</Text> : null
      )}
      {onPress && !rightEl && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />}
    </TouchableOpacity>
  );
}



// ── PIN Change Modal ─────────────────────────────────────────────────────────
function PinModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const { pin_hash, setSetting } = useSettingsStore();
  
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('new');
  const [pinInput, setPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState(false);
  const [shakeAnim] = useState(new Animated.Value(0));

  const hasPinSet = !!pin_hash;

  React.useEffect(() => {
    if (visible) {
      setStep(hasPinSet ? 'current' : 'new');
      setPinInput('');
      setNewPin('');
      setError(false);
    }
  }, [visible, hasPinSet]);

  const shake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setError(true);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start(() => {
      setError(false);
      setPinInput('');
    });
  };

  const handleKeyPress = async (key: string) => {
    if (key === '⌫') {
      setPinInput(p => p.slice(0, -1));
      return;
    }

    if (pinInput.length >= 6) return;

    const nextPin = pinInput + key;
    setPinInput(nextPin);

    if (nextPin.length === 6) {
      setTimeout(async () => {
        if (step === 'current') {
          const valid = await verifyPin(nextPin, pin_hash);
          if (valid) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setStep('new');
            setPinInput('');
          } else {
            shake();
          }
        } else if (step === 'new') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setNewPin(nextPin);
          setStep('confirm');
          setPinInput('');
        } else {
          if (nextPin === newPin) {
            try {
              const hash = await hashPin(nextPin);
              await setSetting('pin_hash', hash);
              await setSetting('pin_enabled', true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Berhasil', 'PIN Keamanan Anda berhasil diperbarui.');
              onClose();
            } catch (e) {
              Alert.alert('Gagal', 'Gagal menyimpan PIN.');
              setStep('new');
              setPinInput('');
            }
          } else {
            shake();
          }
        }
      }, 150);
    }
  };

  const labels = {
    current: 'Masukkan PIN saat ini',
    new: 'Masukkan PIN baru (6 digit)',
    confirm: 'Konfirmasi PIN baru Anda',
  };

  const dots = Array(6).fill(0);
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['Batal', '0', '⌫'],
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface, paddingBottom: 36 }]}>
          <View style={styles.modalHandle} />
          
          <View style={{ alignItems: 'center', marginVertical: 8 }}>
            <View style={[styles.lockIconContainer, { backgroundColor: hexToRgba(Colors.primary, 0.1) }]}>
              <Ionicons name="lock-closed" size={24} color={Colors.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text, marginTop: 12, marginBottom: 4 }]}>
              {hasPinSet ? 'Ubah PIN Keamanan' : 'Buat PIN Keamanan'}
            </Text>
            <Text style={[styles.pinLabel, { color: colors.textSecondary, fontSize: 13 }]}>
              {labels[step]}
            </Text>
          </View>

          {/* PIN Dots */}
          <Animated.View style={[styles.modalDotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
            {dots.map((_, i) => {
              const isFilled = i < pinInput.length;
              return (
                <View
                  key={i}
                  style={[
                    styles.modalDot,
                    { borderColor: error ? Colors.expense : isFilled ? Colors.primary : colors.border },
                    isFilled && { backgroundColor: Colors.primary },
                    error && { backgroundColor: Colors.expense }
                  ]}
                />
              );
            })}
          </Animated.View>

          {/* Custom Numeric Keypad */}
          <View style={styles.modalKeypad}>
            {keys.map((row, rIdx) => (
              <View key={rIdx} style={styles.modalKeypadRow}>
                {row.map((k, kIdx) => {
                  const isSpecial = k === 'Batal' || k === '⌫';
                  return (
                    <TouchableOpacity
                      key={kIdx}
                      style={[
                        styles.modalKeyBtn,
                        { backgroundColor: isSpecial ? 'transparent' : colors.input }
                      ]}
                      onPress={() => {
                        if (k === 'Batal') {
                          onClose();
                        } else {
                          handleKeyPress(k);
                        }
                      }}
                      activeOpacity={0.6}
                    >
                      {k === '⌫' ? (
                        <Ionicons name="backspace" size={22} color={colors.text} />
                      ) : k === 'Batal' ? (
                        <Text style={[styles.modalKeyCancelText, { color: colors.textSecondary }]}>Batal</Text>
                      ) : (
                        <Text style={[styles.modalKeyText, { color: colors.text }]}>{k}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Helper function to check valid image URI
const isValidUri = (uri: string | null | undefined): boolean => {
  if (!uri) return false;
  if (typeof uri !== 'string') return false;
  const trimmed = uri.trim();
  if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null') return false;
  return true;
};

// ── Main Profile Screen ───────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile_name, profile_image, dark_mode, pin_enabled, biometric_enabled, setSetting, toggleDarkMode, loadSettings, login_email } = useSettingsStore();
  const { loadWallets } = useWalletStore();
  const { loadCategories } = useCategoryStore();
  const { loadTransactions, loadMonthSummary } = useTransactionStore();

  const [tempName, setTempName] = useState(profile_name);
  const [tempImage, setTempImage] = useState(profile_image);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile_name);
  const [showPinModal, setShowPinModal] = useState(false);

  // Sync with store settings when they load
  React.useEffect(() => {
    setTempName(profile_name);
    setNameInput(profile_name);
  }, [profile_name]);

  React.useEffect(() => {
    setTempImage(profile_image);
  }, [profile_image]);

  const handlePickImage = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setTempImage(uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Gagal memilih foto profil');
    }
  };

  const handleAvatarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const options: any[] = [
      { text: 'Pilih dari Galeri', onPress: handlePickImage },
    ];

    if (tempImage && isValidUri(tempImage)) {
      options.push({
        text: 'Hapus Foto Profil',
        style: 'destructive' as const,
        onPress: () => {
          setTempImage('');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      });
    }

    options.push({ text: 'Batal', style: 'cancel' as const, onPress: () => {} });

    Alert.alert('Foto Profil', 'Pilih tindakan untuk foto profil Anda', options);
  };

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
      'Pemulihan Data',
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

              Alert.alert('Berhasil', 'Data Anda berhasil dipulihkan dan disinkronisasikan!');
            } catch (e: any) {
              Alert.alert('Gagal Restore', e.message || 'Terjadi kesalahan');
            }
          },
        },
      ]
    );
  };

  const finishEditingName = () => {
    if (nameInput.trim()) {
      setTempName(nameInput.trim());
    } else {
      setNameInput(tempName);
    }
    setEditingName(false);
  };

  const handleSaveProfileChanges = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      let changed = false;

      if (tempName.trim() && tempName.trim() !== profile_name) {
        await setSetting('profile_name', tempName.trim());
        changed = true;
      }
      if (tempImage !== profile_image) {
        await setSetting('profile_image', tempImage);
        changed = true;
      }

      if (changed) {
        Alert.alert('Berhasil', 'Profil Anda berhasil diperbarui.');
      }
    } catch (error) {
      console.error('Error saving profile changes:', error);
      Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan perubahan profil.');
    }
  };

  const renderHeader = (title: string) => (
    <View style={[styles.header, { paddingTop: insets.top + 12, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
      <Text style={[styles.headerTitle, { color: colors.text, flex: 1 }]}>{title}</Text>
    </View>
  );

  const hasChanges = tempName.trim() !== profile_name || tempImage !== profile_image;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader('Profil')}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile Card */}
        <LinearGradient
          colors={['#1A6FE8', '#4F46E5', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileCard}
        >
          {/* Decorative circles for texture */}
          <View style={styles.profileCircle1}>
            <LinearGradient colors={['rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.01)']} style={{ flex: 1 }} />
          </View>
          <View style={styles.profileCircle2}>
            <LinearGradient colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.01)']} style={{ flex: 1 }} />
          </View>

          {/* Yellow save button at top-right */}
          {hasChanges && (
            <TouchableOpacity
              style={styles.saveProfileBtn}
              onPress={handleSaveProfileChanges}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle" size={30} color="#FACC15" />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.85} style={styles.profileAvatar}>
            {tempImage && isValidUri(tempImage) ? (
              <Image source={{ uri: tempImage }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.profileAvatarText}>
                {(tempName || 'P')[0].toUpperCase()}
              </Text>
            )}
            <View style={styles.editAvatarBadge}>
              <Ionicons name="camera" size={12} color="#FFF" />
            </View>
          </TouchableOpacity>
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={[styles.nameInputEdit, { color: '#fff', borderBottomColor: 'rgba(255,255,255,0.5)' }]}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                onBlur={finishEditingName}
                onSubmitEditing={finishEditingName}
                selectionColor={Colors.accent}
              />
              <TouchableOpacity onPress={finishEditingName} style={styles.saveNameBtn}>
                <Ionicons name="checkmark-circle" size={26} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingName(true)} style={{ alignItems: 'center' }}>
              <Text style={styles.profileName}>{tempName}</Text>
              <Text style={styles.profileSubtitle}>Ketuk untuk ubah nama</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* Preferences */}
        <SectionHeader title="Preferensi" />
        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          <SettingsRow
            icon="moon"
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
            label="PIN Keamanan"
            subtitle={pin_enabled ? 'Aktif' : 'Nonaktif'}
            onPress={() => setShowPinModal(true)}
          />
          <SettingsRow
            icon="finger-print"
            label="Sidik Jari"
            hideDivider={true}
            rightEl={
              <Switch
                value={biometric_enabled}
                onValueChange={v => setSetting('biometric_enabled', v)}
                trackColor={{ false: colors.border, true: Colors.income }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* Manage Data Settings */}
        <SectionHeader title="Kelola Data Keuangan" />
        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          <SettingsRow
            icon="wallet"
            label="Kelola Dompet"
            subtitle="Atur rekening, kas, dan dompet keuangan"
            onPress={() => router.push('/wallet-manager' as any)}
          />
          <SettingsRow
            icon="pricetags"
            label="Kelola Kategori"
            subtitle="Atur kategori pemasukan & pengeluaran"
            hideDivider={true}
            onPress={() => router.push('/category-manager' as any)}
          />
        </View>

        {/* Backup & Restore */}
        <SectionHeader title="Ekspor & Cadangkan Data" />
        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          <SettingsRow
            icon="document-text"
            label="Ekspor Laporan CSV"
            subtitle="Ekspor riwayat transaksi ke file CSV"
            onPress={handleExportCSV}
          />
          <SettingsRow
            icon="code-working"
            label="Ekspor Laporan HTML"
            subtitle="Ekspor laporan siap print"
            onPress={handleExportHTML}
          />
          <SettingsRow
            icon="cloud-upload"
            label="Cadangkan Data (Backup JSON)"
            subtitle="Simpan data ke file JSON"
            onPress={handleBackup}
          />
          <SettingsRow
            icon="cloud-download"
            label="Puluhkan Data (Restore JSON)"
            subtitle="Restore data dari file backup"
            hideDivider={true}
            onPress={handleRestore}
          />
        </View>

        {/* About */}
        <SectionHeader title="Tentang Aplikasi" />
        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          <SettingsRow icon="information-circle" label="Versi Keobi" value="1.0.0" hideDivider={true} />
        </View>

        {/* Danger Zone */}
        <SectionHeader title="Zona Berbahaya" />
        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          <SettingsRow
            icon="log-out"
            label="Keluar (Log Out)"
            labelColor={Colors.expense}
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
            label="Hapus Akun Permanen"
            labelColor={Colors.expense}
            subtitle="Hapus seluruh data akun secara permanen"
            hideDivider={true}
            onPress={() => {
              Alert.alert(
                'Hapus Akun',
                'Apakah Anda yakin ingin menghapus akun secara permanen? Seluruh data transaksi, dompet, kategori, dan preferensi akan dihapus selamanya.',
                [
                  { text: 'Batal', style: 'cancel' },
                  {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: () => {
                      Alert.alert(
                        'Konfirmasi Terakhir',
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
                                Alert.alert('Akun Dihapus', 'Semua data akun Anda berhasil dibersihkan.');
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
      </ScrollView>

      <PinModal visible={showPinModal} onClose={() => setShowPinModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800' },
  backBtn: {
    paddingRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeToggleContainer: {
    flexDirection: 'row', marginHorizontal: 20, borderRadius: BorderRadius.md, padding: 4,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: BorderRadius.md,
  },
  modeBtnText: { fontSize: FontSize.md },
  profileCard: {
    marginHorizontal: 20, borderRadius: BorderRadius.lg, padding: 24,
    alignItems: 'center', gap: 8, marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  saveProfileBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  profileCircle1: {
    position: 'absolute', top: -30, right: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  profileCircle2: {
    position: 'absolute', bottom: -40, left: -10,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarImage: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  profileAvatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '80%',
  },
  nameInputEdit: {
    flex: 1,
    fontSize: FontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    borderBottomWidth: 1,
    paddingBottom: 4,
  },
  saveNameBtn: {
    padding: 2,
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
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: { fontSize: FontSize.md, fontWeight: '600' },
  settingsSubtitle: { fontSize: 12, marginTop: 1 },
  settingsValue: { fontSize: FontSize.sm },
  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', marginBottom: 16 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg, borderWidth: 1.5, alignItems: 'center' },
  cancelText: { fontSize: FontSize.md, fontWeight: '600' },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: BorderRadius.lg, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  pinLabel: { fontSize: FontSize.md, marginBottom: 12 },
  lockIconContainer: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
  },
  modalDotsContainer: {
    flexDirection: 'row', justifyContent: 'center', gap: 16,
    marginVertical: 24,
  },
  modalDot: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  modalKeypad: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  modalKeypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  modalKeyBtn: {
    width: 68, height: 68, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  modalKeyText: {
    fontSize: 22, fontWeight: '700',
  },
  modalKeyCancelText: {
    fontSize: 14, fontWeight: '600',
  },
});
