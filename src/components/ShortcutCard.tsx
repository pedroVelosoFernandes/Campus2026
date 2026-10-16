import type { LucideIcon } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radii, shadows, spacing, typography } from '@/theme';

import { IconTile } from './IconTile';
import { PressableScale } from './PressableScale';

export type ShortcutCardProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  testID?: string;
};

/** Cartão compacto da grade 2×2 da tela inicial: ícone, título e subtítulo. */
function ShortcutCardBase({ icon, title, subtitle, onPress, testID }: ShortcutCardProps) {
  return (
    <PressableScale
      onPress={onPress}
      testID={testID}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      containerStyle={styles.container}
      style={styles.card}>
      <IconTile icon={icon} size={46} />
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

export const ShortcutCard = memo(ShortcutCardBase);

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    flex: 1,
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  texts: { gap: spacing.xxs },
  title: { ...typography.bodyMedium, fontFamily: fontFamily.semibold, color: colors.textHeading },
  // Reserva duas linhas: os quatro cartões ficam com a mesma altura.
  subtitle: { ...typography.caption, fontSize: 13.5, lineHeight: 18, minHeight: 36, color: colors.textSecondary },
});
