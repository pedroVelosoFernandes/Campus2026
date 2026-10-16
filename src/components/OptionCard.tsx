import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useContrastColors } from '@/features/settings';
import { colors, fontFamily, radii, shadows, spacing, typography } from '@/theme';

import { AppText } from './AppText';
import { IconTile } from './IconTile';
import { PressableScale } from './PressableScale';

export type OptionCardProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  testID?: string;
};

/** Cartão de opção da tela "Como você quer cuidar da saúde?" (ícone + título + subtítulo + chevron). */
function OptionCardBase({ icon, title, subtitle, onPress, testID }: OptionCardProps) {
  const palette = useContrastColors();
  return (
    <PressableScale
      onPress={onPress}
      testID={testID}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      pressedScale={0.98}
      style={[styles.card, { borderColor: palette.border }]}>
      <IconTile icon={icon} size={64} />
      <View style={styles.texts}>
        <AppText style={styles.title}>{title}</AppText>
        {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
      </View>
      <ChevronRight size={24} color={colors.textHeading} strokeWidth={2} />
    </PressableScale>
  );
}

export const OptionCard = memo(OptionCardBase);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg + 2,
    minHeight: 110,
    paddingVertical: spacing.lg + 2,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md + 2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  texts: { flex: 1, gap: spacing.xs },
  title: { ...typography.headline, fontFamily: fontFamily.bold, fontSize: 21, lineHeight: 27, color: colors.textHeading },
  subtitle: { ...typography.body, color: colors.textSecondary },
});
