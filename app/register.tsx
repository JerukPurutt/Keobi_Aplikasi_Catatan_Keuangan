// Register Screen - Keobi Premium Redesign
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, BorderRadius } from '../src/constants/Colors';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { hashPassword } from '../src/utils/helpers';
import { getDatabase, seedDefaultDataForUser } from '../src/db/database';
import * as Haptics from 'expo-haptics';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { setSetting } = useSettingsStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  // Entrance animation — runs once only
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 9,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRegister = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedEmail) {
      Alert.alert('Gagal', 'Email/Username tidak boleh kosong');
      return;
    }
    if (trimmedPassword.length < 8) {
      Alert.alert('Gagal', 'Sandi minimal harus 8 karakter');
      return;
    }
    if (trimmedPassword !== trimmedConfirm) {
      Alert.alert('Gagal', 'Konfirmasi sandi tidak cocok');
      return;
    }

    setLoading(true);
    try {
      const db = await getDatabase();

      const existingUser = await db.getFirstAsync<{ email: string }>(
        'SELECT email FROM users WHERE LOWER(email) = LOWER(?)',
        [trimmedEmail]
      );
      if (existingUser) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Gagal Daftar', 'Email/Username ini sudah terdaftar.');
        return;
      }

      const pwdHash = await hashPassword(trimmedPassword);
      await db.runAsync(
        'INSERT INTO users (email, password_hash, profile_name, pin_hash, pin_enabled, biometric_enabled) VALUES (?, ?, ?, ?, 0, 0)',
        [trimmedEmail, pwdHash, trimmedEmail.split('@')[0], '']
      );

      await seedDefaultDataForUser(db, trimmedEmail);
      await setSetting('login_email', trimmedEmail);
      await setSetting('session_active', false);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        '🎉 Registrasi Berhasil',
        'Akun Anda telah terdaftar. Silakan masuk menggunakan akun baru Anda.',
        [
          {
            text: 'Masuk Sekarang',
            onPress: () => router.replace('/login' as any),
          },
        ]
      );
    } catch (e) {
      console.error('Registration error:', e);
      Alert.alert('Error', 'Terjadi kesalahan sistem saat mencoba mendaftar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Top subtle ocean gradient accent */}
      <LinearGradient
        colors={['#E0F2FE', '#F8FAFC']}
        style={styles.topAccent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top + 16, 40) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.inner,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../assets/icon.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.appName}>keobi</Text>
              <Text style={styles.tagline}>Mulai perjalanan finansial Anda</Text>
            </View>

            {/* Card Form */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Buat Akun</Text>
              <Text style={styles.cardSubtitle}>Buat akun untuk mulai mencatat keuangan</Text>

              {/* Email Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email / Username</Text>
                <View style={[styles.inputRow, emailFocused && styles.inputRowFocused]}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={emailFocused ? Colors.primary : '#94A3B8'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Masukkan email atau username"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    autoComplete="off"
                    importantForAutofill="no"
                    keyboardType="default"
                    underlineColorAndroid="transparent"
                    returnKeyType="next"
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </View>
              </View>

              {/* Password Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Kata Sandi</Text>
                <View style={[styles.inputRow, passwordFocused && styles.inputRowFocused]}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={passwordFocused ? Colors.primary : '#94A3B8'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Minimal 8 karakter"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    autoComplete="off"
                    importantForAutofill="no"
                    keyboardType="default"
                    underlineColorAndroid="transparent"
                    returnKeyType="next"
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={19}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Konfirmasi Kata Sandi</Text>
                <View style={[styles.inputRow, confirmFocused && styles.inputRowFocused]}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={confirmFocused ? Colors.primary : '#94A3B8'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ulangi kata sandi"
                    placeholderTextColor="#94A3B8"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    autoComplete="off"
                    importantForAutofill="no"
                    keyboardType="default"
                    underlineColorAndroid="transparent"
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                    onFocus={() => setConfirmFocused(true)}
                    onBlur={() => setConfirmFocused(false)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={19}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password strength hint */}
              {password.length > 0 && (
                <View style={styles.strengthRow}>
                  <View
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor:
                          password.length < 4
                            ? Colors.expense
                            : password.length < 8
                            ? '#F59E0B'
                            : Colors.income,
                        flex: Math.min(password.length / 12, 1),
                      },
                    ]}
                  />
                  <Text style={styles.strengthText}>
                    {password.length < 4
                      ? 'Terlalu pendek'
                      : password.length < 8
                      ? 'Cukup'
                      : 'Kuat'}
                  </Text>
                </View>
              )}

              {/* Register Button */}
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={handleRegister}
                disabled={loading}
                style={[styles.primaryBtnWrapper, { marginTop: 8 }]}
              >
                <LinearGradient
                  colors={['#0284C7', '#0EA5E9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtn}
                >
                  {loading ? (
                    <Text style={styles.primaryBtnText}>Membuat akun...</Text>
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>Buat Akun</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Terms note */}
              <Text style={styles.termsText}>
                Dengan mendaftar, Anda menyetujui syarat & ketentuan penggunaan Keobi.
              </Text>
            </View>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              <Text style={styles.footerText}>Sudah punya akun? </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.replace('/login' as any)}
              >
                <Text style={styles.footerLink}>Masuk</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flex: {
    flex: 1,
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 240,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  inner: {
    flex: 1,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    marginBottom: 10,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    backgroundColor: '#fff',
  },
  logoImage: {
    width: 68,
    height: 68,
    borderRadius: 22,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 13,
    color: '#64748B',
    letterSpacing: -0.1,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
    textAlign: 'center',
  },

  // Fields
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 48,
    paddingHorizontal: 14,
  },
  inputRowFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F9FF',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    paddingVertical: 0,
    height: '100%',
  },
  eyeBtn: {
    paddingLeft: 8,
  },

  // Password strength
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: -4,
  },
  strengthBar: {
    height: 3,
    borderRadius: 2,
    minWidth: 24,
  },
  strengthText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },

  // Primary Button
  primaryBtnWrapper: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 16,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtn: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // Terms
  termsText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#64748B',
    fontSize: 14,
  },
  footerLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
