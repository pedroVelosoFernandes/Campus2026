import { ChevronRight, Phone } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import type { SuggestedAction } from '@/features/voice';
import { colors, radii, shadows, spacing, typography } from '@/theme';

export type SuggestedActionCardProps = {
  action: SuggestedAction;
  /** Abre a tela sugerida; ausente quando a sugestão não tem destino. */
  onOpen?: () => void;
  onCallEmergency: () => void;
  /** Abre a tela com os outros telefones de emergência (/emergencia). */
  onOpenEmergencyContacts?: () => void;
};

const ENTERING = FadeInDown.duration(240).reduceMotion(ReduceMotion.System);

/** Cartão do próximo passo sugerido pelo assistente; emergência destaca o SAMU 192. */
function SuggestedActionCardBase({ action, onOpen, onCallEmergency, onOpenEmergencyContacts }: SuggestedActionCardProps) {
  if (action.emergency) {
    return (
      <Animated.View entering={ENTERING} style={[styles.card, styles.emergency]}>
        <AppText style={styles.emergencyTitle}>Procure atendimento agora</AppText>
        <AppText style={styles.body}>Se houver risco à vida, ligue para o SAMU.</AppText>
        <Button
          label="Ligar 192 (SAMU)"
          icon={Phone}
          onPress={onCallEmergency}
          accessibilityHint="Abre o telefone para ligar 192"
          style={styles.samu}
        />
        {onOpenEmergencyContacts ? (
          <Button
            label="Ver outros contatos de emergência"
            variant="outline"
            onPress={onOpenEmergencyContacts}
            accessibilityHint="Abre a lista de telefones de emergência"
          />
        ) : null}
      </Animated.View>
    );
  }
  if (!onOpen) return null;
  return (
    <Animated.View entering={ENTERING}>
      <PressableScale onPress={onOpen} accessibilityLabel={action.label} style={[styles.card, styles.row]}>
        <View style={styles.texts}>
          <AppText style={styles.caption}>Próximo passo</AppText>
          <AppText style={styles.title}>{action.label}</AppText>
        </View>
        <ChevronRight size={22} color={colors.primary} strokeWidth={2} />
      </PressableScale>
    </Animated.View>
  );
}

export const SuggestedActionCard = memo(SuggestedActionCardBase);

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64 },
  texts: { flex: 1, gap: spacing.xxs },
  caption: { ...typography.caption, color: colors.textSecondary },
  title: { ...typography.bodyMedium, color: colors.textHeading },
  emergency: { gap: spacing.sm, borderColor: colors.danger },
  emergencyTitle: { ...typography.headline, color: colors.danger },
  body: { ...typography.body, color: colors.textBody },
  samu: { marginTop: spacing.xs, backgroundColor: colors.danger, borderColor: colors.danger },
});
