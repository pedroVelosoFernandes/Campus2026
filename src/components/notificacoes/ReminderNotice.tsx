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
};

export type ReminderNoticeProps = { notice: Notice; onOpenSettings: () => void };

/** Retorno do fluxo de lembrete (agendado, negado ou falhou). */
function ReminderNoticeBase({ notice, onOpenSettings }: ReminderNoticeProps) {
  if (!notice) return null;
  const { title, message } = COPY[notice];
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <InfoNote title={title} message={message} />
      {notice === 'denied' ? (
        <Button label="Abrir Ajustes" variant="outline" onPress={onOpenSettings} />
      ) : null}
    </View>
  );
}

export const ReminderNotice = memo(ReminderNoticeBase);

const styles = StyleSheet.create({
  box: { gap: spacing.md },
});
