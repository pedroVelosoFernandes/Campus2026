import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

/**
 * Lembretes locais (expo-notifications). A permissão é pedida só depois de a tela
 * explicar o motivo; se a pessoa negar, o app continua funcionando sem lembretes.
 */
export type ReminderPermission = 'granted' | 'undetermined' | 'denied';

let handlerReady = false;

/** Mostra o lembrete mesmo com o app aberto. */
function ensureForegroundHandler() {
  if (handlerReady) return;
  handlerReady = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function toPermission(response: Notifications.NotificationPermissionsStatus): ReminderPermission {
  if (response.granted) return 'granted';
  // iOS provisório (3) ou efêmero (4) também entregam lembretes.
  const ios = Number(response.ios?.status);
  if (ios === 3 || ios === 4) return 'granted';
  return response.canAskAgain ? 'undetermined' : 'denied';
}

export async function getReminderPermission(): Promise<ReminderPermission> {
  try {
    return toPermission(await Notifications.getPermissionsAsync());
  } catch {
    return 'denied';
  }
}

export async function requestReminderPermission(): Promise<ReminderPermission> {
  try {
    const response = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    const permission = toPermission(response);
    // Negou agora: não insistimos mais nesta sessão.
    return permission === 'undetermined' ? 'denied' : permission;
  } catch {
    return 'denied';
  }
}

/** Próximo dia às 9h, horário em que a UBS já está aberta. */
export function nextMorning(now: Date = new Date(), hour = 9): Date {
  const date = new Date(now);
  date.setDate(date.getDate() + 1);
  date.setHours(hour, 0, 0, 0);
  return date;
}

export async function scheduleReminder(content: { title: string; body: string }, date: Date = nextMorning()) {
  ensureForegroundHandler();
  return Notifications.scheduleNotificationAsync({
    content: { title: content.title, body: content.body, data: { url: '/notificacoes' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

export async function cancelReminder(reminderId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(reminderId);
  } catch {
    // Já disparou ou foi removido pelo sistema: nada a desfazer.
  }
}

export function openNotificationSettings() {
  void Linking.openSettings().catch(() => {});
}
