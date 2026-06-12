// Register Screen for Keobi - Redesigned to match mockup with premium animations
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, Dimensions, KeyboardAvoidingView, Platform, ScrollView,
  Animated, TouchableWithoutFeedback
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

  // Background blobs animations
  const blob1Anim = useRef(new Animated.Value(0)).current;
  const blob2Anim = useRef(new Animated.Value(0)).current;

  // Staggered entrance animations
  const fadeHeader = useRef(new Animated.Value(0)).current;
  const fadeEmail = useRef(new Animated.Value(0)).current;
  const fadePassword = useRef(new Animated.Value(0)).current;
  const fadeConfirm = useRef(new Animated.Value(0)).current;
  const fadeRow = useRef(new Animated.Value(0)).current;
  const fadeSubmit = useRef(new Animated.Value(0)).current;
  const fadeDivider = useRef(new Animated.Value(0)).current;
  const fadeSocial = useRef(new Animated.Value(0)).current;
  const fadeFooter = useRef(new Animated.Value(0)).current;

  const slideHeader = useRef(new Animated.Value(35)).current;
  const slideEmail = useRef(new Animated.Value(35)).current;
  const slidePassword = useRef(new Animated.Value(35)).current;
  const slideConfirm = useRef(new Animated.Value(35)).current;
  const slideRow = useRef(new Animated.Value(35)).current;
  const slideSubmit = useRef(new Animated.Value(35)).current;
  const slideDivider = useRef(new Animated.Value(35)).current;
  const slideSocial = useRef(new Animated.Value(35)).current;
  const slideFooter = useRef(new Animated.Value(35)).current;

  // Button scales
  const submitScale = useRef(new Animated.Value(1)).current;
  const googleScale = useRef(new Animated.Value(1)).current;
  const facebookScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start background ambient floating animations
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(blob1Anim, { toValue: 1, duration: 10000, useNativeDriver: true }),
          Animated.timing(blob1Anim, { toValue: 0, duration: 10000, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(blob2Anim, { toValue: 1, duration: 12000, useNativeDriver: true }),
          Animated.timing(blob2Anim, { toValue: 0, duration: 12000, useNativeDriver: true }),
        ]),
      ])
    ).start();

    // Start staggered entrance animations
    const createStagger = (fade: Animated.Value, slide: Animated.Value) => {
      return Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, friction: 8, tension: 35, useNativeDriver: true }),
      ]);
    };

    Animated.stagger(75, [
      createStagger(fadeHeader, slideHeader),
      createStagger(fadeEmail, slideEmail),
      createStagger(fadePassword, slidePassword),
      createStagger(fadeConfirm, slideConfirm),
      createStagger(fadeRow, slideRow),
      createStagger(fadeSubmit, slideSubmit),
      createStagger(fadeDivider, slideDivider),
      createStagger(fadeSocial, slideSocial),
      createStagger(fadeFooter, slideFooter),
    ]).start();
  }, []);

  const handlePressIn = (scaleVar: Animated.Value) => {
    Animated.spring(scaleVar, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (scaleVar: Animated.Value) => {
    Animated.spring(scaleVar, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

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

      // 4. Set global settings (save email for login auto-population, but keep session inactive)
      await setSetting('login_email', trimmedEmail);
      await setSetting('session_active', false);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert('Registrasi Berhasil', 'Akun Anda telah terdaftar. Silakan masuk menggunakan akun baru Anda.', [
        {
          text: 'Masuk Sekarang',
          onPress: () => {
            router.replace('/login' as any);
          }
        }
      ]);
    } catch (e) {
      console.error('Registration error:', e);
      Alert.alert('Error', 'Terjadi kesalahan sistem saat mencoba mendaftar');
    }
  };

  // Interpolations for background circles
  const blob1TranslateX = blob1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 40],
  });
  const blob1TranslateY = blob1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  });
  const blob1Scale = blob1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const blob2TranslateX = blob2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -50],
  });
  const blob2TranslateY = blob2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 40],
  });
  const blob2Scale = blob2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.25],
  });

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
        {/* Background decorations - Glowing Animated Gradients */}
        <Animated.View 
          style={[
            styles.bgCircle1,
            { 
              transform: [
                { translateX: blob1TranslateX }, 
                { translateY: blob1TranslateY },
                { scale: blob1Scale }
              ] 
            }
          ]}
        >
          <LinearGradient
            colors={['rgba(26, 111, 232, 0.22)', 'rgba(26, 111, 232, 0.02)']}
            style={styles.gradientBlob}
          />
        </Animated.View>

        <Animated.View 
          style={[
            styles.bgCircle2,
            { 
              transform: [
                { translateX: blob2TranslateX }, 
                { translateY: blob2TranslateY },
                { scale: blob2Scale }
              ] 
            }
          ]}
        >
          <LinearGradient
            colors={['rgba(245, 200, 66, 0.12)', 'rgba(245, 200, 66, 0.01)']}
            style={styles.gradientBlob}
          />
        </Animated.View>

        <View style={styles.content}>
          {/* Header left-aligned */}
          <Animated.View 
            style={[
              styles.headerContainer,
              { opacity: fadeHeader, transform: [{ translateY: slideHeader }] }
            ]}
          >
            <Text style={styles.appName}>keobi</Text>
            <Text style={styles.title}>Create your{'\n'}account</Text>
          </Animated.View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Email/Username field */}
            <Animated.View 
              style={[
                styles.inputGroup,
                { opacity: fadeEmail, transform: [{ translateY: slideEmail }] }
              ]}
            >
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
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>
            </Animated.View>

            {/* Password field */}
            <Animated.View 
              style={[
                styles.inputGroup,
                { opacity: fadePassword, transform: [{ translateY: slidePassword }] }
              ]}
            >
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
                  placeholderTextColor="rgba(255,255,255,0.25)"
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
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="rgba(255,255,255,0.4)" 
                  />
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Confirm Password field */}
            <Animated.View 
              style={[
                styles.inputGroup,
                { opacity: fadeConfirm, transform: [{ translateY: slideConfirm }] }
              ]}
            >
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
                  placeholderTextColor="rgba(255,255,255,0.25)"
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
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="rgba(255,255,255,0.4)" 
                  />
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Checkbox Row */}
            <Animated.View 
              style={[
                styles.row,
                { opacity: fadeRow, transform: [{ translateY: slideRow }] }
              ]}
            >
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
            </Animated.View>

            {/* Register Button with Spring scale interaction */}
            <Animated.View 
              style={[
                { opacity: fadeSubmit, transform: [{ translateY: slideSubmit }, { scale: submitScale }] }
              ]}
            >
              <TouchableWithoutFeedback
                onPressIn={() => handlePressIn(submitScale)}
                onPressOut={() => handlePressOut(submitScale)}
                onPress={handleSubmit}
              >
                <View style={styles.submitBtnContainer}>
                  <LinearGradient
                    colors={['#1A6FE8', '#0D4FA8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtnGradient}
                  >
                    <Text style={styles.submitBtnText}>Create Account</Text>
                  </LinearGradient>
                </View>
              </TouchableWithoutFeedback>
            </Animated.View>

            {/* Divider "Or" */}
            <Animated.View 
              style={[
                styles.dividerContainer,
                { opacity: fadeDivider, transform: [{ translateY: slideDivider }] }
              ]}
            >
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or</Text>
              <View style={styles.dividerLine} />
            </Animated.View>

            {/* Social Buttons with Spring scale interactions */}
            <Animated.View 
              style={{ opacity: fadeSocial, transform: [{ translateY: slideSocial }] }}
            >
              <TouchableWithoutFeedback
                onPressIn={() => handlePressIn(googleScale)}
                onPressOut={() => handlePressOut(googleScale)}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert('Info', 'Opsi Google Sign In sedang disimulasikan.');
                }}
              >
                <Animated.View style={[styles.socialBtn, { transform: [{ scale: googleScale }] }]}>
                  <Ionicons name="logo-google" size={18} color="#EA4335" style={styles.socialIcon} />
                  <Text style={styles.socialBtnText}>Sign up with google</Text>
                </Animated.View>
              </TouchableWithoutFeedback>

              <TouchableWithoutFeedback
                onPressIn={() => handlePressIn(facebookScale)}
                onPressOut={() => handlePressOut(facebookScale)}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert('Info', 'Opsi Facebook Sign In sedang disimulasikan.');
                }}
              >
                <Animated.View style={[styles.socialBtn, { transform: [{ scale: facebookScale }] }]}>
                  <Ionicons name="logo-facebook" size={20} color="#1877F2" style={styles.socialIcon} />
                  <Text style={styles.socialBtnText}>Sign up with facebook</Text>
                </Animated.View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </View>

          {/* Switch to Login link at bottom */}
          <Animated.View 
            style={[
              styles.footer,
              { opacity: fadeFooter, transform: [{ translateY: slideFooter }] }
            ]}
          >
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity 
              onPress={() => router.replace('/login' as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.footerLink}>Login</Text>
            </TouchableOpacity>
          </Animated.View>
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
    width: 320, height: 320, borderRadius: 160,
    overflow: 'hidden',
  },
  bgCircle2: {
    position: 'absolute', bottom: -80, left: -80,
    width: 280, height: 280, borderRadius: 140,
    overflow: 'hidden',
  },
  gradientBlob: {
    flex: 1,
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
    fontSize: 22,
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
    // Glassmorphic shadow style
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(26, 111, 232, 0.04)',
    // Inner glowing shadow simulation
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
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
    // Glassmorphic shadow style
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
