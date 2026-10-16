import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

import { PressableScale } from './PressableScale';

export type SettingsRowProps = {
  icon: LucideIcon;
  label: string;
  detail?: string;
  onPress?: () => void;
};

/** Linha de lista com ícone, rótulo, detalhe opcional e chevron. */
function SettingsRowBase({ icon: Icon, label, detail, onPress }: SettingsRowProps) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      pressedScale={0.985}
      style={styles.row}>
      <Icon size={22} color={colors.primary} strokeWidth={1.6} />
      <View style={styles.texts}>
        <Text style={styles.label}>{label}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      <ChevronRight size={20} color={colors.textMuted} strokeWidth={1.75} />
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
  label: { ...typography.bodyMedium, color: colors.textHeading },
  detail: { ...typography.caption, color: colors.textSecondary },
});
