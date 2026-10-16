import { useEffect, useSyncExternalStore } from 'react';

import { MOCK_NOTIFICATIONS, type AppNotification } from '@/mocks/notifications';

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
  return source
    .filter((item) => !current.dismissedIds.includes(item.id))
    .map((item) => ({
      ...item,
      read: current.readIds.includes(item.id),
      reminderId: current.reminders[item.id] ?? null,
    }));
}

/** Lista visível (sem as removidas) com estado de leitura e contagem de não lidas. */
export function useNotifications() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    void hydrateNotifications();
  }, []);
  const items = selectNotifications(current);
  const unreadCount = items.filter((item) => !item.read).length;
  return { items, unreadCount };
}
