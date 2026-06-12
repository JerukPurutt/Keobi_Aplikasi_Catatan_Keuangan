// Register Screen for Keobi - Redesigned to match mockup
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, Dimensions, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { useWalletStore } from '../src/store/useWalletStore';
import { useCategoryStore } from '../src/store/useCategoryStore';
import { useTransactionStore } from '../src/store/useTransactionStore';
import { Colors, BorderRadius, FontSize, Shadow } from '../src/constants/Colors';
import { hashPassword } from '../src/utils/helpers';
import { getDatabase, seedDefaultDataForUser } from '../src/db/database';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { login_email, setSetting } = useSettingsStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Input focus states for premium visual feedback
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedEmail) {
      Alert.alert('Gagal', 'Email/Username tidak boleh kosong');
      return;
    }
    if (trimmedPassword.length < 4) {
      Alert.alert('Gagal', 'Sandi minimal harus 4 karakter');
      return;
    }
    if (trimmedPassword !== trimmedConfirm) {
      Alert.alert('Gagal', 'Konfirmasi sandi tidak cocok');
      return;
    }

    try {
      const db = await getDatabase();
      
      // 1. Check if email/username already exists in SQLite
      const existingUser = await db.getFirstAsync<{ email: string }>(
        'SELECT email FROM users WHERE LOWER(email) = LOWER(?)',
        [trimmedEmail]
      );
      if (existingUser) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Gagal Daftar', 'Email/Username ini sudah terdaftar.');
        return;
      }

      // 2. Hash password and insert user into users table
      const pwdHash = await hashPassword(trimmedPassword);
      await db.runAsync(
        'INSERT INTO users (email, password_hash, profile_name, pin_hash, pin_enabled, biometric_enabled) VALUES (?, ?, ?, ?, 0, 0)',
        [trimmedEmail, pwdHash, trimmedEmail.split('@')[0], '']
      );

      // 3. Seed default categories & wallet for this specific user
      await seedDefaultDataForUser(db, trimmedEmail);

      // 4. Set global session active settings
      await setSetting('login_email', trimmedEmail);
      await setSetting('session_active', true);

      // 5. Reload all Zustand stores in memory to reflect the new user's empty data
      await Promise.all([
        useSettingsStore.getState().loadSettings(),
        useWalletStore.getState().loadWallets(),
        useCategoryStore.getState().loadCategories(),
        useTransactionStore.getState().loadTransactions(true),
        useTransactionStore.getState().loadMonthSummary(),
      ]);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert('Registrasi Berhasil', 'Akun Anda telah terdaftar secara offline.', [
        {
          text: 'Masuk ke Aplikasi',
          onPress: () => {
            router.replace('/(tabs)' as any);
          }
        }
      ]);
    } catch (e) {
      console.error('Registration error:', e);
      Alert.alert('Error', 'Terjadi kesalahan sistem saat mencoba mendaftar');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: Math.max(insets.top, 24) }
        ]} 
        keyboardShouldPersistTaps="handled"
      >
        {/* Background decorations */}
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />

        <View style={styles.content}>
          {/* Header left-aligned matching the mockup */}
          <View style={styles.headerContainer}>
            <Text style={styles.appName}>keobi</Text>
            <Text style={styles.title}>Create your{'\n'}account</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Email/Username field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your number & email address</Text>
              <View 
                style={[
                  styles.inputWrapper,
                  emailFocused && styles.inputWrapperFocused
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="uiuxshamim68@gmail.com"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>
            </View>

            {/* Password field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Enter your password</Text>
              <View 
                style={[
                  styles.inputWrapper,
                  passwordFocused && styles.inputWrapperFocused
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="••••••••••••••••"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="rgba(255,255,255,0.4)" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm your password</Text>
              <View 
                style={[
                  styles.inputWrapper,
                  confirmFocused && styles.inputWrapperFocused
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="••••••••••••••••"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                />
                <TouchableOpacity 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="rgba(255,255,255,0.4)" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Checkbox Row */}
            <View style={styles.row}>
              <TouchableOpacity 
                style={styles.checkboxRow} 
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Ionicons name="checkmark" size={10} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Remember me</Text>
              </TouchableOpacity>
            </View>

            {/* Register Button with Linear Gradient matching premium mockup */}
            <TouchableOpacity 
              onPress={handleSubmit}
              activeOpacity={0.85}
              style={styles.submitBtnContainer}
            >
              <LinearGradient
                colors={['#1A6FE8', '#0D4FA8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtnGradient}
              >
                <Text style={styles.submitBtnText}>Create Account</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider "Or" */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <TouchableOpacity 
              style={styles.socialBtn}
              onPress={() => Alert.alert('Info', 'Opsi Google Sign In sedang disimulasikan.')}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-google" size={18} color="#EA4335" style={styles.socialIcon} />
              <Text style={styles.socialBtnText}>Sign up with google</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.socialBtn}
              onPress={() => Alert.alert('Info', 'Opsi Facebook Sign In sedang disimulasikan.')}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-facebook" size={20} color="#1877F2" style={styles.socialIcon} />
              <Text style={styles.socialBtnText}>Sign up with facebook</Text>
            </TouchableOpacity>
          </View>

          {/* Switch to Login link at bottom */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/login' as any)}>
              <Text style={styles.footerLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  bgCircle1: {
    position: 'absolute', top: -100, right: -100,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(26, 111, 232, 0.08)',
  },
  bgCircle2: {
    position: 'absolute', bottom: -80, left: -80,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: 'rgba(245, 200, 66, 0.04)',
  },
  content: {
    width: '100%',
    paddingHorizontal: 28,
  },
  headerContainer: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  appName: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -1,
    marginBottom: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  card: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    height: 54,
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(26, 111, 232, 0.03)',
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#fff',
    fontSize: FontSize.md,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  eyeBtn: {
    padding: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  checkboxLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  submitBtnContainer: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    marginBottom: 24,
    ...Shadow.md,
  },
  submitBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
  socialBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  socialIcon: {
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  socialBtnText: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 24, // balance the icon width for center alignment
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 24,
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  footerLink: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
});
