import { ChevronRight, Phone } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { colors, fontFamily, spacing, typography } from '@/theme';

export type EmergencyLinkProps = { onPress: () => void };

/** Link discreto no pé da Início para a tela de telefones de emergência. */
function EmergencyLinkBase({ onPress }: EmergencyLinkProps) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel="Emergência? Ligue 192. Ver telefones de emergência"
      pressedScale={0.97}
      containerStyle={styles.container}
      style={styles.row}>
      <Phone size={16} color={colors.textSecondary} strokeWidth={1.9} />
      <Text style={styles.text}>
        Emergência? <Text style={styles.strong}>Ligue 192</Text>
      </Text>
      <ChevronRight size={16} color={colors.textSecondary} strokeWidth={1.9} />
    </PressableScale>
  );
}

export const EmergencyLink = memo(EmergencyLinkBase);

const styles = StyleSheet.create({
  container: { alignSelf: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  text: { ...typography.body, fontSize: 15, color: colors.textSecondary },
  strong: { fontFamily: fontFamily.semibold, color: colors.textHeading },
});
