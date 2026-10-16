import { useEffect, useSyncExternalStore } from 'react';

import { useSettings } from '@/features/settings';
import { MOCK_NOTIFICATIONS, type AppNotification } from '@/mocks/notifications';

import { remindersToCancel } from './preferences';
import { cancelReminder } from './reminders';
import { EMPTY_STATE, loadState, saveState, type NotificationsState } from './storage';

/**
 * Store mínimo (sem dependências) compartilhado entre o sino da Início e a tela
 * de Notificações. Carrega do AsyncStorage uma vez e persiste a cada mudança.
 */
let state: NotificationsState = EMPTY_STATE;
let hydration: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function hydrateNotifications(): Promise<void> {
  hydration ??= loadState().then((loaded) => {
    // Mudanças feitas antes do carregamento terminar prevalecem sobre o disco.
    state = {
      readIds: [...new Set([...loaded.readIds, ...state.readIds])],
      dismissedIds: [...new Set([...loaded.dismissedIds, ...state.dismissedIds])],
      reminders: { ...loaded.reminders, ...state.reminders },
    };
    emit();
  });
  return hydration;
}

function update(next: (current: NotificationsState) => NotificationsState) {
  state = next(state);
  emit();
  // Grava só depois de carregar o disco, para não apagar o que já estava salvo.
  void hydrateNotifications().then(() => saveState(state));
}

const addId = (ids: string[], id: string) => (ids.includes(id) ? ids : [...ids, id]);

export function markAsRead(id: string) {
  if (state.readIds.includes(id)) return;
  update((current) => ({ ...current, readIds: addId(current.readIds, id) }));
}

export function markAllAsRead(ids: readonly string[]) {
  update((current) => ({ ...current, readIds: [...new Set([...current.readIds, ...ids])] }));
}

export function dismissNotification(id: string) {
  update((current) => ({
    ...current,
    readIds: addId(current.readIds, id),
    dismissedIds: addId(current.dismissedIds, id),
  }));
}

export function setReminder(id: string, reminderId: string | null) {
  update((current) => {
    const reminders = { ...current.reminders };
    if (reminderId) reminders[id] = reminderId;
    else delete reminders[id];
    return { ...current, reminders };
  });
}

/** Só para testes: volta ao estado inicial sem tocar no armazenamento. */
export function resetNotificationsStore() {
  state = EMPTY_STATE;
  hydration = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;

export type NotificationView = AppNotification & { read: boolean; reminderId: string | null };

export function selectNotifications(
  current: NotificationsState,
  source: readonly AppNotification[] = MOCK_NOTIFICATIONS,
): NotificationView[] {
  const dismissed = new Set(current.dismissedIds);
  const read = new Set(current.readIds);
  return source
    .filter((item) => !dismissed.has(item.id))
    .map((item) => ({
      ...item,
      read: read.has(item.id),
      reminderId: current.reminders[item.id] ?? null,
    }));
}

/** Cancela os lembretes agendados das categorias desligadas em Perfil > Notificações. */
export async function cancelDisabledReminders(
  preferences: Parameters<typeof remindersToCancel>[1],
  source: readonly AppNotification[] = MOCK_NOTIFICATIONS,
): Promise<number> {
  await hydrateNotifications();
  const stale = remindersToCancel(state.reminders, preferences, source);
  await Promise.all(stale.map(({ reminderId }) => cancelReminder(reminderId)));
  for (const { id } of stale) setReminder(id, null);
  return stale.length;
}

/**
 * Lista visível (sem as removidas) com estado de leitura e contagem de não lidas.
 * Usado pelo sino da Início (sempre montada), então também aplica as preferências:
 * desligar uma categoria cancela os lembretes dela.
 */
export function useNotifications() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const { settings, ready } = useSettings();
  const preferences = settings.notifications;
  useEffect(() => {
    void hydrateNotifications();
  }, []);
  useEffect(() => {
    if (ready) void cancelDisabledReminders(preferences);
  }, [preferences, ready]);
  const items = selectNotifications(current);
  const unreadCount = items.filter((item) => !item.read).length;
  return { items, unreadCount };
}
