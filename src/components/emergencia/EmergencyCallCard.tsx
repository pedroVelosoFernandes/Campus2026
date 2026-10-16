import { Phone } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { colors, fontFamily, radii, shadows, spacing, typography } from '@/theme';

import type { EmergencyContact } from './contacts';

/** Tom suave do vermelho de perigo, só no cartão do SAMU. */
const URGENT_SURFACE = '#FDF3F2';
const URGENT_BORDER = '#F6D4D2';

export type EmergencyCallCardProps = {
  contact: EmergencyContact;
  onCall: (number: string) => void;
};

/** Cartão grande com o número e um botão de ligar; o cartão inteiro liga. */
function EmergencyCallCardBase({ contact, onCall }: EmergencyCallCardProps) {
  const { number, name, description, urgent } = contact;
  return (
    <PressableScale
      onPress={() => onCall(number)}
      accessibilityLabel={`Ligar para ${name}, ${number.split('').join(' ')}`}
      accessibilityHint={description}
      pressedScale={0.98}
      testID={`ligar-${number}`}
      style={[styles.card, urgent && styles.cardUrgent]}>
      <View style={styles.texts}>
        <View style={styles.heading}>
          <AppText style={[styles.number, urgent && styles.numberUrgent]}>{number}</AppText>
          <AppText style={styles.name}>{name}</AppText>
        </View>
        <AppText style={styles.description}>{description}</AppText>
      </View>
      <View style={[styles.call, urgent && styles.callUrgent]}>
        <Phone size={24} color={colors.onPrimary} strokeWidth={1.9} />
      </View>
    </PressableScale>
  );
}

export const EmergencyCallCard = memo(EmergencyCallCardBase);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: 96,
    paddingVertical: spacing.lg,
    paddingLeft: spacing.xl,
    paddingRight: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  cardUrgent: { borderColor: URGENT_BORDER, backgroundColor: URGENT_SURFACE },
  texts: { flex: 1, gap: spacing.xs },
  heading: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm + 2 },
  number: {
    fontFamily: fontFamily.bold,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.3,
    color: colors.primary,
  },
  numberUrgent: { color: colors.dangerPressed },
  name: { ...typography.headline, color: colors.textHeading },
  description: { ...typography.caption, fontSize: 14.5, lineHeight: 20, color: colors.textSecondary },
  call: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  callUrgent: { backgroundColor: colors.danger },
});
