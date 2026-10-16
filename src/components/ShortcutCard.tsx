import type { LucideIcon } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useContrastColors, useFontScale } from '@/features/settings';
import { colors, fontFamily, radii, shadows, spacing, typography } from '@/theme';

import { AppText } from './AppText';
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
  const palette = useContrastColors();
  // Com texto grande o título quebra em duas linhas em vez de encolher.
  const titleLines = useFontScale() > 1.15 ? 2 : 1;
  return (
    <PressableScale
      onPress={onPress}
      testID={testID}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      containerStyle={styles.container}
      style={[styles.card, { borderColor: palette.border }]}>
      <IconTile icon={icon} size={36} />
      <View style={styles.texts}>
        <AppText style={styles.title} numberOfLines={titleLines} adjustsFontSizeToFit={titleLines === 1} minimumFontScale={0.85}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText style={styles.subtitle} numberOfLines={titleLines + 1}>
            {subtitle}
          </AppText>
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
    gap: spacing.sm + 2,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  texts: { gap: spacing.xxs },
  title: { ...typography.bodyMedium, fontFamily: fontFamily.semibold, lineHeight: 21, color: colors.textHeading },
  // Reserva duas linhas: os quatro cartões ficam com a mesma altura.
  subtitle: { ...typography.caption, fontSize: 13.5, lineHeight: 17, minHeight: 34, color: colors.textSecondary },
});
