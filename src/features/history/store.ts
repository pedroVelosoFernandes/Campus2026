import { useEffect, useSyncExternalStore } from 'react';

import { capConversations, loadConversations, saveConversations } from './storage';
import type { SavedConversation } from './types';

/**
 * Store mínimo (sem dependências) do histórico, no mesmo molde do de
 * notificações: carrega do AsyncStorage uma vez e persiste a cada mudança.
 */
type HistoryState = { ready: boolean; items: SavedConversation[] };

let state: HistoryState = { ready: false, items: [] };
let hydration: Promise<void> | null = null;
/** Ids apagados antes do disco terminar de carregar (não podem "voltar"). */
const deletedBeforeLoad = new Set<string>();
let clearedBeforeLoad = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

export function hydrateHistory(): Promise<void> {
  hydration ??= loadConversations().then((loaded) => {
    const kept = clearedBeforeLoad ? [] : loaded.filter((item) => !deletedBeforeLoad.has(item.id));
    const ids = new Set(state.items.map((item) => item.id));
    state = { ready: true, items: capConversations([...state.items, ...kept.filter((item) => !ids.has(item.id))]) };
    emit();
  });
  return hydration;
}

function update(next: (items: SavedConversation[]) => SavedConversation[]) {
  state = { ...state, items: next(state.items) };
  emit();
  // Grava só depois de carregar o disco, para não apagar o que já estava salvo.
  void hydrateHistory().then(() => saveConversations(state.items));
}

/** Cria ou atualiza (mesmo id) uma conversa. */
export function upsertConversation(conversation: SavedConversation) {
  update((items) => capConversations([conversation, ...items.filter((item) => item.id !== conversation.id)]));
}

export function deleteConversation(id: string) {
  deletedBeforeLoad.add(id);
  update((items) => items.filter((item) => item.id !== id));
}

export function clearConversations() {
  clearedBeforeLoad = true;
  update(() => []);
}

export function getConversation(id: string): SavedConversation | null {
  return state.items.find((item) => item.id === id) ?? null;
}

/** Só para testes: volta ao estado inicial sem tocar no armazenamento. */
export function resetHistoryStore() {
  state = { ready: false, items: [] };
  hydration = null;
  deletedBeforeLoad.clear();
  clearedBeforeLoad = false;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;

/** Lista (mais recentes primeiro) e se o disco já foi lido. */
export function useConversations(): HistoryState {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    void hydrateHistory();
  }, []);
  return current;
}

export function useConversation(id: string | undefined): { ready: boolean; conversation: SavedConversation | null } {
  const { ready, items } = useConversations();
  return { ready, conversation: (id && items.find((item) => item.id === id)) || null };
}
