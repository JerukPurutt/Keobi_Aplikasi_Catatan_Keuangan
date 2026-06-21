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
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />

      {/* Top gradient accent */}
      <LinearGradient
        colors={['#1A6FE8', '#0A1628']}
        style={styles.topAccent}
        start={{ x: 0.2, y: 0 }}
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
                    color={emailFocused ? '#1A6FE8' : 'rgba(255,255,255,0.35)'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Masukkan email atau username"
                    placeholderTextColor="rgba(255,255,255,0.25)"
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
                    color={passwordFocused ? '#1A6FE8' : 'rgba(255,255,255,0.35)'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Minimal 8 karakter"
                    placeholderTextColor="rgba(255,255,255,0.25)"
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
                      color="rgba(255,255,255,0.4)"
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
                    color={confirmFocused ? '#1A6FE8' : 'rgba(255,255,255,0.35)'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ulangi kata sandi"
                    placeholderTextColor="rgba(255,255,255,0.25)"
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
                      color="rgba(255,255,255,0.4)"
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
                            ? '#EF4444'
                            : password.length < 8
                            ? '#F5C842'
                            : '#22C55E',
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
                activeOpacity={0.85}
                onPress={handleRegister}
                disabled={loading}
                style={[styles.primaryBtnWrapper, { marginTop: 8 }]}
              >
                <LinearGradient
                  colors={['#1A6FE8', '#0D4FA8']}
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
    backgroundColor: '#0A1628',
  },
  flex: {
    flex: 1,
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    opacity: 0.5,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
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
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#1A6FE8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    backgroundColor: '#fff',
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 28,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
  },

  // Card
  card: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 24,
    textAlign: 'center',
  },

  // Fields
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    height: 52,
    paddingHorizontal: 14,
  },
  inputRowFocused: {
    borderColor: '#1A6FE8',
    backgroundColor: 'rgba(26,111,232,0.06)',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
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
    marginTop: -6,
  },
  strengthBar: {
    height: 3,
    borderRadius: 2,
    minWidth: 24,
  },
  strengthText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },

  // Primary Button
  primaryBtnWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#1A6FE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtn: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Terms
  termsText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
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
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  footerLink: {
    color: '#1A6FE8',
    fontSize: 14,
    fontWeight: '700',
  },
});
