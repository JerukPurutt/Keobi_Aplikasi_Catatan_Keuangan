// Theme hook - resolves current colors based on dark/light mode
import { useSettingsStore } from '../store/useSettingsStore';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../constants/Colors';

export const useTheme = () => {
  const dark_mode = useSettingsStore(s => s.dark_mode);
  const theme = dark_mode ? Colors.dark : Colors.light;

  return {
    isDark: dark_mode,
    colors: theme,
    global: Colors,
    spacing: Spacing,
    radius: BorderRadius,
    fontSize: FontSize,
    fontWeight: FontWeight,
    shadow: dark_mode ? Shadow.dark : Shadow.md,
  };
};
