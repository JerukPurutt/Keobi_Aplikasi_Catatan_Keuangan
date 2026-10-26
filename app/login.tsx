// Login Screen - Keobi Premium Redesign
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
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, BorderRadius, Shadow } from '../src/constants/Colors';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { useWalletStore } from '../src/store/useWalletStore';
import { useCategoryStore } from '../src/store/useCategoryStore';
import { useTransactionStore } from '../src/store/useTransactionStore';
import { useGoalStore } from '../src/store/useGoalStore';
import { verifyPassword } from '../src/utils/helpers';
import { getDatabase } from '../src/db/database';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login_email, setSetting, loadSettings } = useSettingsStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Entrance animation — runs once only
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    loadSettings();
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

  useEffect(() => {
    if (login_email) setEmail(login_email);
  }, [login_email]);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      Alert.alert('Gagal', 'Email/Username tidak boleh kosong');
      return;
    }
    if (!trimmedPassword) {
      Alert.alert('Gagal', 'Sandi tidak boleh kosong');
      return;
    }

    setLoading(true);
    try {
      const db = await getDatabase();
      const user = await db.getFirstAsync<{
        email: string;
        password_hash: string;
        pin_enabled: number;
        pin_hash: string;
      }>(
        'SELECT email, password_hash, pin_enabled, pin_hash FROM users WHERE LOWER(email) = LOWER(?)',
        [trimmedEmail]
      );

      if (!user) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Gagal Masuk', 'Email/Username tidak terdaftar');
        return;
      }

      const isValid = await verifyPassword(trimmedPassword, user.password_hash);
      if (isValid) {
        await setSetting('login_email', user.email);
        await setSetting('session_active', true);

        const freshSettings = useSettingsStore.getState();
        await Promise.all([
          freshSettings.loadSettings(),
          useWalletStore.getState().loadWallets(),
          useCategoryStore.getState().loadCategories(),
          useTransactionStore.getState().loadTransactions(true),
          useTransactionStore.getState().loadMonthSummary(),
          useGoalStore.getState().loadGoals(user.email),
        ]);

        const updatedSettings = useSettingsStore.getState();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (user.pin_enabled === 1 && user.pin_hash) {
          router.replace('/pin' as any);
        } else if (!updatedSettings.onboarded) {
          router.replace('/onboarding' as any);
        } else {
          router.replace('/(tabs)' as any);
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Gagal Masuk', 'Sandi yang Anda masukkan salah!');
      }
    } catch (e) {
      console.error('Authentication error:', e);
      Alert.alert('Error', 'Terjadi kesalahan sistem saat mencoba autentikasi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Top subtle ocean gradient accent */}
      <LinearGradient
        colors={['#E0F2FE', '#F8FAFC']}
        style={styles.topAccent}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
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
            {/* Logo & Heading */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../assets/icon.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.appName}>keobi</Text>
              <Text style={styles.tagline}>Atur Keuangan dengan Fresh & Rapi</Text>
            </View>

            {/* Card Form */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Masuk</Text>
              <Text style={styles.cardSubtitle}>Selamat datang kembali di Keobi</Text>

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
                    placeholder="Masukkan kata sandi"
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
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
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

              {/* Forgot password */}
              <TouchableOpacity
                style={styles.forgotRow}
                activeOpacity={0.7}
                onPress={() =>
                  Alert.alert(
                    'Reset Sandi',
                    'Untuk akun offline, buat akun baru jika lupa sandi.'
                  )
                }
              >
                <Text style={styles.forgotText}>Lupa kata sandi?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={handleLogin}
                disabled={loading}
                style={styles.primaryBtnWrapper}
              >
                <LinearGradient
                  colors={['#0284C7', '#0EA5E9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtn}
                >
                  {loading ? (
                    <Text style={styles.primaryBtnText}>Memproses...</Text>
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>Masuk</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>atau</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Buttons */}
              <TouchableOpacity
                style={styles.socialBtn}
                activeOpacity={0.8}
                onPress={() => Alert.alert('Info', 'Google Sign In sedang disimulasikan.')}
              >
                <Ionicons name="logo-google" size={18} color="#EA4335" />
                <Text style={styles.socialBtnText}>Masuk dengan Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialBtn}
                activeOpacity={0.8}
                onPress={() => Alert.alert('Info', 'Facebook Sign In sedang disimulasikan.')}
              >
                <Ionicons name="logo-facebook" size={19} color="#1877F2" />
                <Text style={styles.socialBtnText}>Masuk dengan Facebook</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              <Text style={styles.footerText}>Belum punya akun? </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.replace('/register' as any)}
              >
                <Text style={styles.footerLink}>Daftar sekarang</Text>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  inner: {
    flex: 1,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    marginBottom: 10,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
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

  // Forgot
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -2,
  },
  forgotText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },

  // Primary Button
  primaryBtnWrapper: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
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

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    color: '#94A3B8',
    fontSize: 12,
  },

  // Social
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  socialBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#64748B',
    fontSize: 13,
  },
  footerLink: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
