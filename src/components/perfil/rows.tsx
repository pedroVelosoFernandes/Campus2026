import { ChevronRight, ExternalLink, type LucideIcon } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { useContrastColors, useScaledTypography } from '@/features/settings';
import { colors, spacing } from '@/theme';

export type ToggleRowProps = {
  icon: LucideIcon;
  label: string;
  detail?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  testID?: string;
};

/**
 * Linha com interruptor. A linha inteira é o alvo de toque (e um único
 * elemento "switch" para o leitor de tela); o Switch é só visual.
 */
function ToggleRowBase({ icon: Icon, label, detail, value, onValueChange, disabled, testID }: ToggleRowProps) {
  const type = useScaledTypography();
  const palette = useContrastColors();
  return (
    <PressableScale
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={detail}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      pressedScale={0.985}
      style={styles.row}>
      <Icon size={22} color={colors.primary} strokeWidth={1.6} />
      <View style={styles.texts}>
        <Text style={[type.bodyMedium, { color: palette.textHeading }]}>{label}</Text>
        {detail ? <Text style={[type.caption, { color: palette.textSecondary }]}>{detail}</Text> : null}
      </View>
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Switch
          value={value}
          disabled={disabled}
          trackColor={{ false: colors.borderStrong, true: colors.primary }}
          ios_backgroundColor={colors.borderStrong}
        />
      </View>
    </PressableScale>
  );
}

export const ToggleRow = memo(ToggleRowBase);

export type ActionRowProps = {
  icon: LucideIcon;
  label: string;
  detail?: string;
  onPress: () => void;
  /** danger: ação destrutiva (ícone e rótulo em vermelho). */
  tone?: 'default' | 'danger';
  /** external: abre algo fora do app (navegador, e-mail). */
  trailing?: 'chevron' | 'external' | 'none';
  accessibilityHint?: string;
  testID?: string;
};

/** Linha de ação com ícone, rótulo, detalhe e indicador à direita. */
function ActionRowBase({
  icon: Icon,
  label,
  detail,
  onPress,
  tone = 'default',
  trailing = 'chevron',
  accessibilityHint,
  testID,
}: ActionRowProps) {
  const type = useScaledTypography();
  const palette = useContrastColors();
  const danger = tone === 'danger';
  const tint = danger ? colors.dangerPressed : colors.primary;
  return (
    <PressableScale
      onPress={onPress}
      testID={testID}
      accessibilityRole={trailing === 'external' ? 'link' : 'button'}
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      accessibilityHint={accessibilityHint}
      pressedScale={0.985}
      style={styles.row}>
      <Icon size={22} color={tint} strokeWidth={1.6} />
      <View style={styles.texts}>
        <Text style={[type.bodyMedium, { color: danger ? colors.dangerPressed : palette.textHeading }]}>{label}</Text>
        {detail ? <Text style={[type.caption, { color: palette.textSecondary }]}>{detail}</Text> : null}
      </View>
      {trailing === 'chevron' ? <ChevronRight size={20} color={palette.textMuted} strokeWidth={1.75} /> : null}
      {trailing === 'external' ? <ExternalLink size={18} color={palette.textMuted} strokeWidth={1.75} /> : null}
    </PressableScale>
  );
}

export const ActionRow = memo(ActionRowBase);

export type InfoRowProps = {
  icon: LucideIcon;
  label: string;
  detail: string;
};

/** Linha só informativa (sem toque), ex.: "O que tratamos" na tela de privacidade. */
function InfoRowBase({ icon: Icon, label, detail }: InfoRowProps) {
  const type = useScaledTypography();
  const palette = useContrastColors();
  return (
    <View style={[styles.row, styles.top]} accessible accessibilityLabel={`${label}. ${detail}`}>
      <Icon size={22} color={colors.primary} strokeWidth={1.6} style={styles.iconTop} />
      <View style={styles.texts}>
        <Text style={[type.bodyMedium, { color: palette.textHeading }]}>{label}</Text>
        <Text style={[type.caption, { color: palette.textSecondary }]}>{detail}</Text>
      </View>
    </View>
  );
}

export const InfoRow = memo(InfoRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  top: { alignItems: 'flex-start', paddingVertical: spacing.lg },
  iconTop: { marginTop: 1 },
  texts: { flex: 1, gap: spacing.xxs },
});
