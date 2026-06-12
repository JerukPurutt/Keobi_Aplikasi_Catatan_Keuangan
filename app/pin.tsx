// PIN / Biometric authentication screen for Keobi with premium animations
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, Alert, TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { Colors, BorderRadius, FontSize } from '../src/constants/Colors';
import { verifyPin, hashPin } from '../src/utils/helpers';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PIN_LENGTH = 6;

interface KeypadButtonProps {
  value: string;
  onPress: () => void;
  disabled?: boolean;
  biometricEnabled?: boolean;
  isCreating?: boolean;
}

function KeypadButton({ value, onPress, disabled, biometricEnabled, isCreating }: KeypadButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.86, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.6, duration: 100, useNativeDriver: true })
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true })
    ]).start();
  };

  const isBackspace = value === '⌫';
  const isBiometric = value === 'biometric';
  const showBiometricIcon = isBiometric && biometricEnabled && !isCreating;

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.keyBtn,
          isBackspace && styles.backspaceBtn,
          showBiometricIcon && styles.fingerprintBtn,
          isBiometric && !showBiometricIcon && styles.placeholderBtn,
          { transform: [{ scale }], opacity }
        ]}
      >
        {isBackspace ? (
          <Ionicons name="backspace" size={24} color="rgba(255,255,255,0.9)" />
        ) : showBiometricIcon ? (
          <Ionicons name="finger-print" size={28} color={Colors.accent} />
        ) : isBiometric ? (
          <Ionicons name="lock-closed" size={20} color="rgba(255,255,255,0.15)" />
        ) : (
          <Text style={styles.keyText}>{value}</Text>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

export default function PinScreen() {
  const insets = useSafeAreaInsets();
  const { pin_hash, biometric_enabled, profile_name, setSetting } = useSettingsStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // States for creating a PIN on first run
  const isCreating = !pin_hash;
  const [tempPin, setTempPin] = useState('');
  const [createStep, setCreateStep] = useState<'enter' | 'confirm'>('enter');

  const shake = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const onAuthenticated = useCallback(() => {
    router.replace('/(tabs)' as any);
  }, []);

  const handleBiometric = useCallback(async () => {
    if (isCreating) return; // No biometric setup during first-run onboarding
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) return;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Masuk ke Keobi',
        cancelLabel: 'Gunakan PIN',
        disableDeviceFallback: false,
      });

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onAuthenticated();
      }
    } catch (e) {
      console.error('Biometric error:', e);
    }
  }, [onAuthenticated, isCreating]);

  useEffect(() => {
    if (biometric_enabled && !isCreating) {
      setTimeout(handleBiometric, 500);
    }

    // Gentle breathing loop animation for background blobs
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 4000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.94, duration: 4000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleKey = useCallback(async (key: string) => {
    if (attempts >= 5) return;

    if (key === '⌫') {
      setPin(p => p.slice(0, -1));
      setError('');
      return;
    }

    const newPin = pin + key;
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      if (isCreating) {
        if (createStep === 'enter') {
          // Store first entry and ask for confirmation
          setTempPin(newPin);
          setPin('');
          setCreateStep('confirm');
          setError('');
        } else {
          // Confirm step
          if (newPin === tempPin) {
            try {
              const hash = await hashPin(newPin);
              await setSetting('pin_hash', hash);
              await setSetting('pin_enabled', true);
              await setSetting('onboarded', true);
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onAuthenticated();
            } catch (e) {
              setError('Gagal menyimpan PIN. Coba lagi.');
              setPin('');
              setTempPin('');
              setCreateStep('enter');
            }
          } else {
            setError('PIN tidak cocok! Silakan ulangi.');
            shake();
            setPin('');
            setTempPin('');
            setCreateStep('enter');
          }
        }
      } else {
        // Normal login mode
        const valid = await verifyPin(newPin, pin_hash);
        if (valid) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onAuthenticated();
        } else {
          setError('PIN salah!');
          shake();
          // Delay Alert popup slightly to let red dots shake finish
          setTimeout(async () => {
            Alert.alert('PIN Salah', 'PIN yang Anda masukkan salah. Sesi berakhir, silakan masuk kembali dengan password.', [
              {
                text: 'OK',
                onPress: async () => {
                  await setSetting('session_active', false);
                  router.replace('/login' as any);
                }
              }
            ]);
            setPin('');
            setError('');
          }, 350);
        }
      }
    }
  }, [pin, pin_hash, attempts, shake, onAuthenticated, isCreating, createStep, tempPin]);

  const dots = Array(PIN_LENGTH).fill(0);
  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['biometric', '0', '⌫'],
  ];

  return (
    <LinearGradient colors={['#0F2038', '#070F1A']} style={styles.container}>
      {/* Background decorations - Animated Glowing circles */}
      <Animated.View style={[styles.bgCircle1, { transform: [{ scale: pulseAnim }] }]}>
        <LinearGradient
          colors={['rgba(26, 111, 232, 0.22)', 'rgba(26, 111, 232, 0.02)']}
          style={styles.gradientBlob}
        />
      </Animated.View>

      <Animated.View style={[styles.bgCircle2, { transform: [{ scale: pulseAnim }] }]}>
        <LinearGradient
          colors={['rgba(245, 200, 66, 0.12)', 'rgba(245, 200, 66, 0.01)']}
          style={styles.gradientBlob}
        />
      </Animated.View>

      <Animated.View style={[styles.bgCircle3, { transform: [{ scale: pulseAnim }] }]}>
        <LinearGradient
          colors={['rgba(26, 111, 232, 0.1)', 'rgba(26, 111, 232, 0.01)']}
          style={styles.gradientBlob}
        />
      </Animated.View>

      <View style={[styles.content, { paddingTop: Math.max(insets.top, 24) }]}>
        {/* Logo */}
        <Text style={styles.appName}>Keobi</Text>
        <Text style={styles.greeting}>
          {isCreating ? 'Buat PIN Pengaman Baru' : `Selamat datang, ${profile_name} `}
        </Text>
        <Text style={styles.subtitle}>
          {isCreating 
            ? (createStep === 'enter' ? 'Masukkan 6 digit PIN baru Anda' : 'Masukkan kembali PIN Anda untuk konfirmasi')
            : 'Masukkan PIN untuk melanjutkan'}
        </Text>

        {/* PIN Dots */}
        <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
          {dots.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < pin.length && styles.dotFilled,
                error && styles.dotError,
              ]}
            />
          ))}
        </Animated.View>

        {/* Error Message */}
        <View style={styles.errorContainer}>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
        </View>

        {/* Keypad */}
        <View style={styles.keypad}>
          {rows.map((row, rIdx) => (
            <View key={rIdx} style={styles.keypadRow}>
              {row.map((key, kIdx) => {
                const isBiometric = key === 'biometric';
                const showBiometricIcon = isBiometric && biometric_enabled && !isCreating;
                
                return (
                  <KeypadButton
                    key={kIdx}
                    value={key}
                    disabled={attempts >= 5 || (isBiometric && !showBiometricIcon)}
                    biometricEnabled={biometric_enabled}
                    isCreating={isCreating}
                    onPress={() => {
                      if (showBiometricIcon) {
                        handleBiometric();
                      } else if (key === '⌫') {
                        handleKey('⌫');
                      } else if (!isBiometric) {
                        handleKey(key);
                      }
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>

        {/* Back to Login Link */}
        <TouchableOpacity 
          style={styles.backToLoginBtn} 
          onPress={async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await setSetting('session_active', false);
            router.replace('/login' as any);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={16} color={Colors.accent} style={{ marginRight: 6 }} />
          <Text style={styles.backToLoginText}>Kembali ke Login</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgCircle1: {
    position: 'absolute', top: -80, right: -80,
    width: 280, height: 280, borderRadius: 140,
    overflow: 'hidden',
  },
  bgCircle2: {
    position: 'absolute', bottom: -60, left: -60,
    width: 220, height: 220, borderRadius: 110,
    overflow: 'hidden',
  },
  bgCircle3: {
    position: 'absolute', top: '40%', left: -40,
    width: 120, height: 120, borderRadius: 60,
    overflow: 'hidden',
  },
  gradientBlob: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 32,
  },
  appName: {
    fontSize: 46,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -2,
    marginBottom: 8,
  },
  greeting: {
    fontSize: FontSize.lg,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.dark.textSecondary,
    marginBottom: 40,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 12,
  },
  dot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: Colors.dark.border,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dotError: {
    backgroundColor: Colors.expense,
    borderColor: Colors.expense,
  },
  errorContainer: {
    height: 20,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: Colors.expense,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  keypad: {
    gap: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  keyBtn: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  fingerprintBtn: {
    borderColor: 'rgba(245, 200, 66, 0.2)',
    backgroundColor: 'rgba(245, 200, 66, 0.05)',
  },
  placeholderBtn: {
    borderColor: 'rgba(255, 255, 255, 0.02)',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  backspaceBtn: {
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  keyText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '600',
  },
  backToLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
  },
  backToLoginText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
});
