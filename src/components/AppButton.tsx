import { Pressable, StyleSheet, Text, ViewStyle, type PressableProps } from 'react-native';
import { colors, minTouch, radius } from '../theme/colors';

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';

interface AppButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: Variant;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const variantStyles: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.accent, fg: '#fff' },
  secondary: { bg: colors.panel, fg: colors.ink, border: colors.line },
  danger: { bg: colors.danger, fg: '#fff' },
  success: { bg: colors.ok, fg: '#fff' },
  ghost: { bg: 'transparent', fg: colors.accent, border: colors.line },
};

export function AppButton({
  title,
  variant = 'primary',
  fullWidth,
  style,
  disabled,
  ...rest
}: AppButtonProps) {
  const v = variantStyles[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={[
        styles.base,
        fullWidth && styles.full,
        {
          backgroundColor: v.bg,
          borderColor: v.border ?? v.bg,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      {...rest}
    >
      <Text style={[styles.text, { color: v.fg }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouch,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  full: { alignSelf: 'stretch' },
  text: { fontSize: 16, fontWeight: '600' },
});
