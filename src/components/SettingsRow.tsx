import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useContrastColors, useScaledTypography } from '@/features/settings';
import { colors, spacing } from '@/theme';

import { PressableScale } from './PressableScale';

export type SettingsRowProps = {
  icon: LucideIcon;
  label: string;
  detail?: string;
  onPress?: () => void;
};

/** Linha de lista com ícone, rótulo, detalhe opcional e chevron. */
function SettingsRowBase({ icon: Icon, label, detail, onPress }: SettingsRowProps) {
  const type = useScaledTypography();
  const palette = useContrastColors();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      pressedScale={0.985}
      style={styles.row}>
      <Icon size={22} color={colors.primary} strokeWidth={1.6} />
      <View style={styles.texts}>
        <Text style={[type.bodyMedium, { color: palette.textHeading }]}>{label}</Text>
        {detail ? <Text style={[type.caption, { color: palette.textSecondary }]}>{detail}</Text> : null}
      </View>
      <ChevronRight size={20} color={palette.textMuted} strokeWidth={1.75} />
    </PressableScale>
  );
}

export const SettingsRow = memo(SettingsRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  texts: { flex: 1, gap: spacing.xxs },
});
