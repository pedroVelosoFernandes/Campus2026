import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { InfoNote } from '@/components/InfoNote';
import type { ReminderNotice as Notice } from '@/features/notifications/use-reminder-flow';
import { spacing } from '@/theme';

const COPY: Record<Exclude<Notice, null>, { title: string; message: string }> = {
  scheduled: { title: 'Lembrete agendado', message: 'Vamos te avisar amanhã às 9h.' },
  denied: {
    title: 'Notificações desativadas',
    message: 'Sem problema: as novidades continuam aqui. Para receber lembretes, ative nos Ajustes.',
  },
  failed: { title: 'Não deu para agendar agora', message: 'Tente de novo em instantes.' },
  disabled: {
    title: 'Lembretes de vacinas desligados',
    message: 'Você desligou esses lembretes nas preferências de notificação. Ative para agendar.',
  },
};

export type ReminderNoticeProps = {
  notice: Notice;
  onOpenSettings: () => void;
  /** Abre Perfil > Notificações (preferências do app). */
  onOpenPreferences?: () => void;
};

/** Retorno do fluxo de lembrete (agendado, negado ou falhou). */
function ReminderNoticeBase({ notice, onOpenSettings, onOpenPreferences }: ReminderNoticeProps) {
  if (!notice) return null;
  const { title, message } = COPY[notice];
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <InfoNote title={title} message={message} />
      {notice === 'denied' ? (
        <Button label="Abrir Ajustes" variant="outline" onPress={onOpenSettings} />
      ) : null}
      {notice === 'disabled' && onOpenPreferences ? (
        <Button label="Abrir preferências" variant="outline" onPress={onOpenPreferences} />
      ) : null}
    </View>
  );
}

export const ReminderNotice = memo(ReminderNoticeBase);

const styles = StyleSheet.create({
  box: { gap: spacing.md },
});
