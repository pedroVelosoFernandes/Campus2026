import type { NotificationPreferences } from '@/features/settings/types';
import type { AppNotification, AppNotificationKind } from '@/mocks/notifications';

/**
 * Liga cada tipo de notificação à preferência de Perfil > Notificações. Com a
 * categoria desligada o app não agenda lembretes e cancela os já agendados.
 */
export const PREFERENCE_BY_KIND: Record<AppNotificationKind, keyof NotificationPreferences> = {
  vacina: 'vaccineReminders',
  consulta: 'appointmentReminders',
  ubs: 'campaignAlerts',
};

export function preferenceFor(kind: AppNotificationKind): keyof NotificationPreferences {
  return PREFERENCE_BY_KIND[kind];
}

export function isReminderAllowed(kind: AppNotificationKind, preferences: NotificationPreferences): boolean {
  return preferences[preferenceFor(kind)];
}

/** Lembretes agendados (id da notificação → id do lembrete) cuja categoria foi desligada. */
export function remindersToCancel(
  reminders: Readonly<Record<string, string>>,
  preferences: NotificationPreferences,
  source: readonly AppNotification[],
): { id: string; reminderId: string }[] {
  const kinds = new Map(source.map((item) => [item.id, item.kind]));
  return Object.entries(reminders)
    .filter(([id]) => {
      const kind = kinds.get(id);
      return kind !== undefined && !isReminderAllowed(kind, preferences);
    })
    .map(([id, reminderId]) => ({ id, reminderId }));
}
