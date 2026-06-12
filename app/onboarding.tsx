// Onboarding screen — shown once for new users after registration
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  ScrollView, Animated, Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { Colors, FontSize, BorderRadius } from '../src/constants/Colors';

const { width: SCREEN_W } = Dimensions.get('window');

type Slide = {
  id: string;
  gradient: [string, string];
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconBg: string;
  title: string;
  subtitle: string;
  tip: string;
};

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    gradient: ['#0F2038', '#1A3560'],
    icon: 'wallet',
    iconBg: 'rgba(26,111,232,0.25)',
    title: 'Selamat Datang di Keobi!',
    subtitle: 'Aplikasi pencatatan keuangan pribadi yang cerdas, aman, dan mudah digunakan.',
    tip: '💡 Keobi = Kelola Keuangan Pribadi',
  },
  {
    id: 'transactions',
    gradient: ['#0A2A1A', '#1A4A2E'],
    icon: 'swap-vertical',
    iconBg: 'rgba(34,197,94,0.25)',
    title: 'Catat Setiap Transaksi',
    subtitle: 'Rekam pemasukan dan pengeluaran harian dengan mudah. Pilih kategori, dompet, dan tambahkan catatan.',
    tip: '💡 Tap tombol + di navbar untuk tambah transaksi',
  },
  {
    id: 'analytics',
    gradient: ['#1A0A2E', '#2D1A4A'],
    icon: 'bar-chart',
    iconBg: 'rgba(139,92,246,0.25)',
    title: 'Analisis Keuanganmu',
    subtitle: 'Lihat grafik pengeluaran per kategori, laporan bulanan, dan insight otomatis untuk keputusan finansial lebih baik.',
    tip: '💡 Cek tab Analisis untuk melihat chart interaktif',
  },
  {
    id: 'goals',
    gradient: ['#1A1000', '#3A2800'],
    icon: 'trophy',
    iconBg: 'rgba(245,200,66,0.25)',
    title: 'Raih Target Tabunganmu',
    subtitle: 'Buat target keuangan seperti beli laptop, liburan, atau investasi. Pantau progresnya setiap saat.',
    tip: '💡 Akses Goals dari halaman Beranda',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const dotAnims = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const { setSetting } = useSettingsStore();

  const goTo = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_W, animated: true });
    // Animate dots
    SLIDES.forEach((_, i) => {
      Animated.spring(dotAnims[i], {
        toValue: i === index ? 1 : 0,
        useNativeDriver: false,
        friction: 6,
      }).start();
    });
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      goTo(currentIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    await setSetting('onboarded', true);
    router.replace('/(tabs)' as any);
  };

  const handleScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx !== currentIndex) goTo(idx);
  };

  const slide = SLIDES[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background gradient that animates with slide */}
      <LinearGradient
        colors={slide.gradient}
        style={StyleSheet.absoluteFill}
      />

      {/* Skip button */}
      {currentIndex < SLIDES.length - 1 && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleFinish}>
          <Text style={styles.skipText}>Lewati</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, i) => (
          <View key={s.id} style={[styles.slide, { width: SCREEN_W }]}>
            {/* Decorative circles */}
            <View style={[styles.decoCircle1, { backgroundColor: s.iconBg }]} />
            <View style={[styles.decoCircle2, { backgroundColor: s.iconBg }]} />

            {/* Icon */}
            <View style={[styles.iconWrapper, { backgroundColor: s.iconBg }]}>
              <Ionicons name={s.icon} size={64} color="#fff" />
            </View>

            {/* Text content */}
            <Text style={styles.slideTitle}>{s.title}</Text>
            <Text style={styles.slideSubtitle}>{s.subtitle}</Text>

            {/* Tip pill */}
            <View style={styles.tipPill}>
              <Text style={styles.tipText}>{s.tip}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom controls */}
      <View style={styles.bottom}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const dotWidth = dotAnims[i].interpolate({
              inputRange: [0, 1],
              outputRange: [8, 28],
            });
            const dotOpacity = dotAnims[i].interpolate({
              inputRange: [0, 1],
              outputRange: [0.4, 1],
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]}
              />
            );
          })}
        </View>

        {/* Next / Start button */}
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.nextBtnGrad}
          >
            <Text style={styles.nextBtnText}>
              {currentIndex === SLIDES.length - 1 ? 'Mulai Sekarang!' : 'Lanjut'}
            </Text>
            <Ionicons
              name={currentIndex === SLIDES.length - 1 ? 'checkmark-circle' : 'arrow-forward'}
              size={20}
              color="#fff"
            />
          </LinearGradient>
        </TouchableOpacity>

        {/* Step indicator */}
        <Text style={styles.stepText}>
          {currentIndex + 1} / {SLIDES.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 48,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  skipText: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm, fontWeight: '600' },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
  },
  // Decorative
  decoCircle1: {
    position: 'absolute', top: -60, right: -60,
    width: 220, height: 220, borderRadius: 110,
  },
  decoCircle2: {
    position: 'absolute', bottom: 100, left: -80,
    width: 180, height: 180, borderRadius: 90,
  },
  // Icon
  iconWrapper: {
    width: 140, height: 140, borderRadius: 70,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 36,
  },
  // Text
  slideTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 32,
  },
  slideSubtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  tipPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  tipText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.sm,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Bottom
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    alignItems: 'center',
    gap: 16,
  },
  dots: { flexDirection: 'row', gap: 6, height: 8 },
  dot: { height: 8, borderRadius: 4, backgroundColor: '#fff' },
  nextBtn: { width: '100%', borderRadius: BorderRadius.xl, overflow: 'hidden' },
  nextBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  nextBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
  stepText: { color: 'rgba(255,255,255,0.4)', fontSize: FontSize.xs },
});
