import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '@/theme';

import { IconTile } from './IconTile';
import { PressableScale } from './PressableScale';

export type ShortcutCardProps = {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
  testID?: string;
};

/** Cartão compacto da seção "Atalhos" da tela inicial. */
function ShortcutCardBase({ icon, label, onPress, testID }: ShortcutCardProps) {
  return (
    <PressableScale
      onPress={onPress}
      testID={testID}
      accessibilityLabel={label}
      containerStyle={styles.container}
      style={styles.card}>
      <IconTile icon={icon} size={46} />
      <View style={styles.row}>
        <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {label}
        </Text>
        <ChevronRight size={20} color={colors.textHeading} strokeWidth={1.75} />
      </View>
    </PressableScale>
  );
}

export const ShortcutCard = memo(ShortcutCardBase);

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  label: { ...typography.bodyMedium, flexShrink: 1, color: colors.textHeading },
});
