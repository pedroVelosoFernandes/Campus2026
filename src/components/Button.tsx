import type { LucideIcon } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useContrastColors } from '@/features/settings';
import { colors, radii, spacing, typography } from '@/theme';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

export type ButtonVariant = 'primary' | 'secondary' | 'outline';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  /** primary: pílula teal preenchida; secondary: pílula menta; outline: branca com borda. */
  variant?: ButtonVariant;
  icon?: LucideIcon;
  /** Preenche o ícone (ex.: seta de navegação sólida do "Como chegar"). */
  iconFilled?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const VARIANTS = {
  primary: { background: colors.primary, border: colors.primary, text: colors.onPrimary, icon: colors.onPrimary },
  secondary: { background: colors.mint, border: colors.border, text: colors.textHeading, icon: colors.primary },
  outline: { background: colors.surface, border: colors.borderStrong, text: colors.textHeading, icon: colors.primary },
} as const;

function ButtonBase({
  label,
  onPress,
  variant = 'primary',
  icon: Icon,
  iconFilled,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}: ButtonProps) {
  const palette = VARIANTS[variant];
  const contrast = useContrastColors();
  // No alto contraste as bordas dos botões claros escurecem (contorno ≥ 3:1).
  const border = variant === 'primary' ? palette.border : variant === 'secondary' ? contrast.border : contrast.borderStrong;
  const isPrimary = variant === 'primary';

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={[
        styles.base,
        isPrimary ? styles.primaryHeight : styles.secondaryHeight,
        { backgroundColor: palette.background, borderColor: border },
        disabled && styles.disabled,
        style,
      ]}>
      <View style={styles.content}>
        {Icon ? <Icon size={22} color={palette.icon} fill={iconFilled ? palette.icon : 'none'} strokeWidth={1.75} /> : null}
        <AppText style={[isPrimary ? styles.primaryLabel : styles.secondaryLabel, { color: palette.text }]}>
          {label}
        </AppText>
      </View>
    </PressableScale>
  );
}

export const Button = memo(ButtonBase);

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  primaryHeight: { minHeight: 56 },
  secondaryHeight: { minHeight: 54 },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  primaryLabel: { ...typography.label },
  secondaryLabel: { ...typography.bodyMedium, fontSize: 17 },
  disabled: { opacity: 0.5 },
});
