import { MessageSquareLock, MessageSquareText, ShieldCheck } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useContrastColors, useScaledTypography } from '@/features/settings';
import { colors, radii, spacing } from '@/theme';

export type HistoryEmptyStateProps = {
  /** Consentimento "Salvar histórico de conversas" ligado. */
  enabled: boolean;
  onOpenPrivacy: () => void;
};

const ART = 88;

/**
 * Sem conversas salvas. Com o histórico desligado (padrão, LGPD) explica o
 * motivo e leva a Perfil > Privacidade para ativar.
 */
function HistoryEmptyStateBase({ enabled, onOpenPrivacy }: HistoryEmptyStateProps) {
  const type = useScaledTypography();
  const palette = useContrastColors();
  const Icon = enabled ? MessageSquareText : MessageSquareLock;
  const title = enabled ? 'Nenhuma conversa salva ainda' : 'O histórico está desligado';
  const message = enabled
    ? 'Suas próximas conversas com o assistente, por texto ou por voz, vão aparecer aqui.'
    : 'Por privacidade, o Alô Saúde não guarda suas conversas. Se quiser rever as orientações depois, ative o histórico. Ele fica só neste aparelho e você pode apagar quando quiser.';

  return (
    <View style={styles.box} testID={enabled ? 'conversas-vazio' : 'conversas-historico-desligado'}>
      <View style={styles.art}>
        <View style={styles.artInner}>
          <Icon size={38} color={colors.primary} strokeWidth={1.6} />
        </View>
      </View>
      <View style={styles.texts}>
        <AppText style={[type.headline, styles.center, { color: palette.textHeading }]} accessibilityRole="header">
          {title}
        </AppText>
        <AppText style={[type.body, styles.center, { color: palette.textSecondary }]}>{message}</AppText>
      </View>
      {enabled ? null : (
        <Button
          label="Ativar em Privacidade"
          icon={ShieldCheck}
          variant="secondary"
          onPress={onOpenPrivacy}
          accessibilityHint="Abre Perfil, Privacidade e dados"
          style={styles.button}
        />
      )}
    </View>
  );
}

export const HistoryEmptyState = memo(HistoryEmptyStateBase);

const styles = StyleSheet.create({
  box: { alignItems: 'center', gap: spacing.xl, paddingTop: spacing.xxxl, paddingHorizontal: spacing.sm },
  art: {
    width: ART + 24,
    height: ART + 24,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glowOuter,
  },
  artInner: {
    width: ART,
    height: ART,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mintStrong,
  },
  texts: { gap: spacing.sm, maxWidth: 340 },
  center: { textAlign: 'center' },
  button: { alignSelf: 'stretch' },
});
