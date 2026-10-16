import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';

import { useSettings } from '@/features/settings';

import {
  cancelReminder,
  getReminderPermission,
  requestReminderPermission,
  scheduleReminder,
} from './reminders';
import { isReminderAllowed } from './preferences';
import { markAsRead, setReminder, type NotificationView } from './store';

/** `disabled`: a categoria está desligada em Perfil > Notificações. */
export type ReminderNotice = 'scheduled' | 'denied' | 'failed' | 'disabled' | null;

const success = () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

async function schedule(item: NotificationView): Promise<ReminderNotice> {
  if (!item.reminder) return null;
  try {
    const reminderId = await scheduleReminder(item.reminder);
    setReminder(item.id, reminderId);
    success();
    return 'scheduled';
  } catch {
    return 'failed';
  }
}

/**
 * Fluxo "Lembrar da vacina": explica antes de pedir a permissão do sistema,
 * agenda se permitido e, se negado, mostra como ativar sem bloquear nada.
 */
export function useReminderFlow() {
  const [explaining, setExplaining] = useState<NotificationView | null>(null);
  const [notice, setNotice] = useState<ReminderNotice>(null);
  const preferences = useSettings().settings.notifications;

  const toggle = useCallback(async (item: NotificationView) => {
    setNotice(null);
    markAsRead(item.id);
    if (item.reminderId) {
      await cancelReminder(item.reminderId);
      setReminder(item.id, null);
      return;
    }
    if (!isReminderAllowed(item.kind, preferences)) {
      setNotice('disabled');
      return;
    }
    const permission = await getReminderPermission();
    if (permission === 'granted') setNotice(await schedule(item));
    else if (permission === 'undetermined') setExplaining(item);
    else setNotice('denied');
  }, [preferences]);

  const confirm = useCallback(async () => {
    const item = explaining;
    setExplaining(null);
    if (!item) return;
    const permission = await requestReminderPermission();
    setNotice(permission === 'granted' ? await schedule(item) : 'denied');
  }, [explaining]);

  const cancel = useCallback(() => setExplaining(null), []);
  const clearNotice = useCallback(() => setNotice(null), []);

  return { explaining, notice, toggle, confirm, cancel, clearNotice };
}
