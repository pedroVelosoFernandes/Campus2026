import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography, shadows } from '@/theme';

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
  return (
    <PressableScale
      onPress={onPress}
      testID={testID}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      pressedScale={0.98}
      style={styles.card}>
      <IconTile icon={icon} size={52} />
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <ChevronRight size={22} color={colors.textHeading} strokeWidth={1.75} />
    </PressableScale>
  );
}

export const OptionCard = memo(OptionCardBase);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: 104,
    paddingVertical: spacing.lg,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  texts: { flex: 1, gap: spacing.xs },
  title: { ...typography.headline, color: colors.textHeading },
  subtitle: { ...typography.caption, color: colors.textSecondary },
});
