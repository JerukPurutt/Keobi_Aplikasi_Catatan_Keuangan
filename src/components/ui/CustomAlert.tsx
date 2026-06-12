// Beautiful Custom Alert Modal Component for Keobi
import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlertStore, AlertButton } from '../../store/useAlertStore';
import { useTheme } from '../../hooks/useTheme';
import { Colors, BorderRadius, FontSize, Shadow } from '../../constants/Colors';
import { hexToRgba } from '../../utils/helpers';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CustomAlert() {
  const { visible, title, message, buttons, hideAlert } = useAlertStore();
  const { colors, isDark } = useTheme();

  if (!visible) return null;

  // Detect alert type based on title or content
  const lowerTitle = title.toLowerCase();
  const lowerMsg = message.toLowerCase();
  
  let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'information-circle';
  let iconColor = Colors.primary;

  if (
    lowerTitle.includes('berhasil') || 
    lowerTitle.includes('sukses') || 
    lowerTitle.includes('✅') ||
    lowerMsg.includes('berhasil')
  ) {
    iconName = 'checkmark-circle';
    iconColor = Colors.income;
  } else if (
    lowerTitle.includes('gagal') || 
    lowerTitle.includes('error') || 
    lowerTitle.includes('salah') || 
    lowerTitle.includes('kurang') ||
    lowerMsg.includes('salah') ||
    lowerMsg.includes('tidak mencukupi')
  ) {
    iconName = 'alert-circle';
    iconColor = Colors.expense;
  } else if (
    lowerTitle.includes('yakin') || 
    lowerTitle.includes('hapus') || 
    lowerTitle.includes('keluar') || 
    lowerTitle.includes('⚠️') ||
    lowerMsg.includes('hapus') ||
    lowerMsg.includes('keluar')
  ) {
    iconName = 'warning';
    iconColor = Colors.accent;
  }

  // Handle button press
  const handleButtonPress = (btn: AlertButton) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    hideAlert();
    if (btn.onPress) {
      // Small timeout to allow modal close animation to finish smoothly
      setTimeout(() => {
        btn.onPress?.();
      }, 100);
    }
  };

  // Determine button arrangement (horizontal row or vertical stack)
  // Stack vertically if there are more than 2 buttons, or if button text is too long
  const isHorizontal = 
    buttons.length <= 2 && 
    buttons.every(btn => (btn.text || '').length <= 10);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={hideAlert}
    >
      <View style={styles.overlay}>
        <View style={[styles.alertCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Icon Header */}
          <View style={[styles.iconContainer, { backgroundColor: hexToRgba(iconColor, 0.12) }]}>
            <Ionicons name={iconName} size={36} color={iconColor} />
          </View>

          {/* Title & Description */}
          {title ? (
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          ) : null}
          
          {message ? (
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          ) : null}

          {/* Buttons Area */}
          <View 
            style={[
              styles.buttonsContainer, 
              isHorizontal ? styles.buttonsRow : styles.buttonsColumn
            ]}
          >
            {buttons.map((btn, idx) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              
              let btnBg = Colors.primary;
              let btnTextCol = '#fff';
              let btnBorder = 'transparent';
              let borderWidth = 0;

              if (isCancel) {
                btnBg = colors.surfaceSecondary;
                btnTextCol = colors.textSecondary;
                btnBorder = colors.border;
                borderWidth = 1;
              } else if (isDestructive) {
                btnBg = Colors.expense;
                btnTextCol = '#fff';
              }

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.button,
                    { 
                      backgroundColor: btnBg, 
                      borderColor: btnBorder,
                      borderWidth: borderWidth,
                      flex: isHorizontal ? 1 : undefined 
                    }
                  ]}
                  onPress={() => handleButtonPress(btn)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.buttonText, { color: btnTextCol }]}>
                    {btn.text || 'OK'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 22, 40, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  alertCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    ...Shadow.lg,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonsContainer: {
    width: '100%',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonsColumn: {
    flexDirection: 'column',
    gap: 10,
  },
  button: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonText: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
