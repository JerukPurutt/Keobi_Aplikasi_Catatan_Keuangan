// Root app layout with expo-router, auth guard, and app initialization
import { useEffect, useState, useCallback, useRef } from 'react';
import { Stack, router, ThemeProvider, DefaultTheme, DarkTheme } from 'expo-router';
import { View, Text, ActivityIndicator, Alert, StatusBar, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { useWalletStore } from '../src/store/useWalletStore';
import { useTransactionStore } from '../src/store/useTransactionStore';
import { useCategoryStore } from '../src/store/useCategoryStore';
import { useGoalStore } from '../src/store/useGoalStore';
import { Colors } from '../src/constants/Colors';
import getDatabase from '../src/db/database';
import { useAlertStore } from '../src/store/useAlertStore';
import CustomAlert from '../src/components/ui/CustomAlert';

// Monkeypatch Alert.alert to use our custom alert modal globally
(Alert as any).alert = (title: any, message: any, buttons: any) => {
  useAlertStore.getState().showAlert(
    title || '',
    message || '',
    buttons
  );
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Animated values for interactive splash screen
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { loadSettings, pin_enabled, pin_hash, isLoaded, dark_mode, session_active, login_email } = useSettingsStore();
  const { loadWallets } = useWalletStore();
  const { loadTransactions, loadMonthSummary } = useTransactionStore();
  const { loadCategories } = useCategoryStore();
  const { loadGoals } = useGoalStore();

  const init = useCallback(async () => {
    try {
      await getDatabase();
      await Promise.all([
        loadSettings(),
        loadWallets(),
        loadTransactions(true),
        loadMonthSummary(),
        loadCategories(),
      ]);
    } catch (e) {
      console.error('App init error:', e);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    init();

    // Start intro animations
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 30,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Loop breathing pulse animation gently
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: 1500,
            useNativeDriver: true,
          })
        ])
      ).start();
    });
  }, []);

  useEffect(() => {
    if (isReady && isLoaded && !authChecked) {
      setAuthChecked(true);
      SplashScreen.hideAsync();

      if (!session_active || !login_email) {
        router.replace('/login' as any);
      } else if (pin_enabled && pin_hash) {
        router.replace('/pin' as any);
      }
      // Load goals after auth confirmed
      if (session_active && login_email) {
        loadGoals(login_email);
      }
    }
  }, [isReady, isLoaded, authChecked, pin_enabled, pin_hash, session_active, login_email]);

  if (!isReady || !isLoaded) {
    const combinedScale = Animated.multiply(scaleAnim, pulseAnim);
    return (
      <LinearGradient
        colors={['#0F2038', '#070F1A']}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

        {/* Background decorative circles */}
        <View style={{
          position: 'absolute', top: -100, right: -100,
          width: 300, height: 300, borderRadius: 150,
          backgroundColor: 'rgba(26, 111, 232, 0.08)',
        }} />
        <View style={{
          position: 'absolute', bottom: -80, left: -80,
          width: 250, height: 250, borderRadius: 125,
          backgroundColor: 'rgba(245, 200, 66, 0.04)',
        }} />

        <Animated.View
          style={{
            alignItems: 'center',
            transform: [{ scale: combinedScale }],
            opacity: opacityAnim,
          }}
        >
          {/* Logo Icon */}
          <Image
            source={require('../assets/icon.png')}
            style={{
              width: 110,
              height: 110,
              borderRadius: 24,
              marginBottom: 16,
            }}
            resizeMode="contain"
          />

          {/* Title */}
          <Text style={{
            color: '#fff',
            fontSize: 42,
            fontWeight: '900',
            letterSpacing: -2,
            marginBottom: 6,
          }}>
            keobi
          </Text>

          {/* Subtitle / Brand Slogan */}
          <Text style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: 14,
            fontWeight: '500',
            marginBottom: 32,
            textAlign: 'center',
          }}>
            Atur Keuangan dengan Mudah & Aman
          </Text>
        </Animated.View>

        {/* Loading Indicator */}
        <Animated.View
          style={{
            opacity: opacityAnim,
            alignItems: 'center',
            gap: 12,
          }}
        >
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 12, letterSpacing: 0.5 }}>
            Memuat data...
          </Text>
        </Animated.View>
      </LinearGradient>
    );
  }

  const bg = dark_mode ? Colors.dark.background : Colors.light.background;

  const navigationTheme = {
    ...(dark_mode ? DarkTheme : DefaultTheme),
    colors: {
      ...(dark_mode ? DarkTheme.colors : DefaultTheme.colors),
      background: bg,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar barStyle={dark_mode ? 'light-content' : 'dark-content'} translucent={true} backgroundColor="transparent" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="pin" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="goals" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="wallet/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="category/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="wallet-manager" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="category-manager" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <CustomAlert />
    </ThemeProvider>
  );
}
