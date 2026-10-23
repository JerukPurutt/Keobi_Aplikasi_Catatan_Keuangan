// Shadcn-inspired UI components for React Native (Keobi Fresh Ocean Blue & White)
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Colors, BorderRadius, FontSize, FontWeight, Shadow } from '../../constants/Colors';
import * as Haptics from 'expo-haptics';

// ── CARD ──────────────────────────────────────────────────────────────────────
export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  bordered?: boolean;
}

export function Card({ children, style, bordered = true }: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: bordered ? colors.border : 'transparent',
          ...Shadow.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CardHeader({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.cardHeader, style]}>{children}</View>;
}

export function CardTitle({ children, style }: { children: React.ReactNode; style?: TextStyle | TextStyle[] }) {
  const { colors } = useTheme();
  return <Text style={[styles.cardTitle, { color: colors.text }, style]}>{children}</Text>;
}

export function CardDescription({ children, style }: { children: React.ReactNode; style?: TextStyle | TextStyle[] }) {
  const { colors } = useTheme();
  return <Text style={[styles.cardDescription, { color: colors.textSecondary }, style]}>{children}</Text>;
}

export function CardContent({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.cardContent, style]}>{children}</View>;
}

// ── BADGE ─────────────────────────────────────────────────────────────────────
export interface BadgeProps {
  label: string;
  variant?: 'ocean' | 'secondary' | 'success' | 'destructive' | 'outline';
  icon?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
}

export function Badge({ label, variant = 'ocean', icon, style, textStyle }: BadgeProps) {
  const { colors, isDark } = useTheme();

  let bg = Colors.primaryTint;
  let text = Colors.primary;
  let border = 'transparent';

  if (variant === 'secondary') {
    bg = colors.surfaceSecondary;
    text = colors.textSecondary;
    border = colors.border;
  } else if (variant === 'success') {
    bg = isDark ? 'rgba(16, 185, 129, 0.2)' : Colors.incomeLight;
    text = Colors.incomeDark;
  } else if (variant === 'destructive') {
    bg = isDark ? 'rgba(244, 63, 94, 0.2)' : Colors.expenseLight;
    text = Colors.expenseDark;
  } else if (variant === 'outline') {
    bg = 'transparent';
    text = colors.textSecondary;
    border = colors.border;
  } else if (variant === 'ocean') {
    bg = isDark ? 'rgba(2, 132, 199, 0.2)' : '#E0F2FE';
    text = Colors.primary;
    border = isDark ? 'rgba(2, 132, 199, 0.3)' : '#BAE6FD';
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: border, borderWidth: border !== 'transparent' ? 1 : 0 }, style]}>
      {icon}
      <Text style={[styles.badgeText, { color: text }, textStyle]}>{label}</Text>
    </View>
  );
}

// ── BUTTON ────────────────────────────────────────────────────────────────────
export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  let bg = Colors.primary;
  let textColor = '#FFFFFF';
  let borderColor = 'transparent';

  if (variant === 'secondary') {
    bg = colors.surfaceSecondary;
    textColor = Colors.primary;
    borderColor = colors.border;
  } else if (variant === 'outline') {
    bg = colors.surface;
    textColor = colors.text;
    borderColor = colors.border;
  } else if (variant === 'ghost') {
    bg = 'transparent';
    textColor = colors.textSecondary;
  } else if (variant === 'destructive') {
    bg = Colors.expense;
    textColor = '#FFFFFF';
  }

  const paddingV = size === 'sm' ? 8 : size === 'lg' ? 14 : 11;
  const paddingH = size === 'sm' ? 12 : size === 'lg' ? 20 : 16;
  const fontSize = size === 'sm' ? FontSize.xs : size === 'lg' ? FontSize.md : FontSize.sm;

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: disabled ? colors.border : bg,
          borderColor: disabled ? 'transparent' : borderColor,
          borderWidth: borderColor !== 'transparent' ? 1 : 0,
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
        },
        variant === 'primary' && !disabled && Shadow.sm,
        style,
      ]}
    >
      {icon && iconPosition === 'left' && <View style={{ marginRight: 6 }}>{icon}</View>}
      <Text
        style={[
          styles.buttonText,
          {
            color: disabled ? colors.textMuted : textColor,
            fontSize,
          },
        ]}
      >
        {loading ? 'Memproses...' : title}
      </Text>
      {icon && iconPosition === 'right' && <View style={{ marginLeft: 6 }}>{icon}</View>}
    </TouchableOpacity>
  );
}

// ── SEGMENTED CONTROL / TABS ──────────────────────────────────────────────────
export interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T; icon?: string }[];
  value: T;
  onChange: (val: T) => void;
  style?: ViewStyle;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.segmentContainer,
        { backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9' },
        style,
      ]}
    >
      {options.map(opt => {
        const isSelected = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => {
              if (!isSelected) {
                Haptics.selectionAsync();
                onChange(opt.value);
              }
            }}
            activeOpacity={0.8}
            style={[
              styles.segmentItem,
              isSelected && [
                styles.segmentItemActive,
                { backgroundColor: colors.surface, ...Shadow.sm },
              ],
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: isSelected
                    ? Colors.primary
                    : colors.textSecondary,
                  fontWeight: isSelected ? '700' : '500',
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cardDescription: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
  },
  buttonText: {
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  segmentContainer: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: BorderRadius.lg,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  segmentItemActive: {},
  segmentText: {
    fontSize: FontSize.xs,
  },
});
