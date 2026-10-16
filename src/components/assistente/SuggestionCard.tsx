import { router, type Href } from 'expo-router';
import { MapPin, MessageSquare, Phone, Syringe, Video, type LucideIcon } from 'lucide-react-native';
import { memo } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { OptionCard } from '@/components/OptionCard';
import { PressableScale } from '@/components/PressableScale';
import type { SuggestedAction, SuggestedActionKind } from '@/features/voice';
import { colors, radii, spacing, typography } from '@/theme';

const DESTINATIONS: Record<SuggestedActionKind, { href: Href; icon: LucideIcon; subtitle: string }> = {
  vacinacao: { href: '/vacinacao', icon: Syringe, subtitle: 'Ver opções de vacinação' },
  teleconsulta: { href: '/teleconsulta', icon: Video, subtitle: 'Ver como funciona' },
  'cuidar-saude': { href: '/cuidar-saude', icon: MapPin, subtitle: 'Ver opções de atendimento' },
  conversas: { href: '/conversas', icon: MessageSquare, subtitle: 'Abrir no histórico' },
};

const callSamu = () => {
  Linking.openURL('tel:192').catch(() => {
    // Sem discador (ex.: simulador): o número continua visível na tela.
  });
};

export type SuggestionCardProps = {
  action: SuggestedAction;
  /** Chamado antes de navegar (ex.: encerrar a sessão de voz). */
  onNavigate?: () => void;
};

/** Próximo passo sugerido pelo assistente; em emergência, destaca a ligação para o SAMU. */
function SuggestionCardBase({ action, onNavigate }: SuggestionCardProps) {
  const destination = DESTINATIONS[action.kind];
  const open = () => {
    onNavigate?.();
    router.navigate(destination.href);
  };

  if (action.emergency) {
    return (
      <View style={styles.emergency} accessibilityRole="alert">
        <Text style={styles.emergencyTitle}>Procure ajuda agora</Text>
        <Text style={styles.emergencyText}>{action.label}</Text>
        <PressableScale
          onPress={callSamu}
          accessibilityLabel="Ligar para o SAMU, 192"
          pressedScale={0.97}
          style={styles.samu}>
          <Phone size={20} color={colors.onPrimary} strokeWidth={2} />
          <Text style={styles.samuLabel}>Ligar para o SAMU 192</Text>
        </PressableScale>
      </View>
    );
  }

  return <OptionCard icon={destination.icon} title={action.label} subtitle={destination.subtitle} onPress={open} />;
}

export const SuggestionCard = memo(SuggestionCardBase);

const styles = StyleSheet.create({
  emergency: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
  },
  emergencyTitle: { ...typography.headline, color: colors.dangerPressed },
  emergencyText: { ...typography.body, color: colors.textBody },
  samu: {
    marginTop: spacing.xs,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.danger,
  },
  samuLabel: { ...typography.label, color: colors.onPrimary },
});
