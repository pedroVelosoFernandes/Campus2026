import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  MAX_CONVERSATIONS,
  MAX_MESSAGE_CHARS,
  MAX_MESSAGES_PER_CONVERSATION,
  type ConversationOutcome,
  type SavedConversation,
  type SavedMessage,
} from './types';

/** Mesmo prefixo das outras chaves do app: entra em "Baixar/Apagar meus dados". */
export const HISTORY_KEY = '@alo-saude/conversas/v1';

const isString = (value: unknown): value is string => typeof value === 'string';

function sanitizeMessage(raw: unknown): SavedMessage | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { role, text } = raw as Record<string, unknown>;
  if ((role !== 'user' && role !== 'assistant') || !isString(text) || !text.trim()) return null;
  return { role, text: text.slice(0, MAX_MESSAGE_CHARS) };
}

function sanitizeOutcome(raw: unknown): ConversationOutcome | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { kind, label, emergency } = raw as Record<string, unknown>;
  const kinds = ['vacinacao', 'teleconsulta', 'cuidar-saude', 'conversas'];
  if (!isString(kind) || !kinds.includes(kind) || !isString(label)) return null;
  return { kind: kind as ConversationOutcome['kind'], label, ...(emergency === true ? { emergency: true } : null) };
}

/** Valida um registro lido do disco; registros corrompidos são descartados. */
export function sanitizeConversation(raw: unknown): SavedConversation | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const item = raw as Record<string, unknown>;
  if (!isString(item.id) || !isString(item.title) || !isString(item.startedAt) || !isString(item.updatedAt)) {
    return null;
  }
  const messages = Array.isArray(item.messages)
    ? item.messages.map(sanitizeMessage).filter((message): message is SavedMessage => message !== null)
    : [];
  if (messages.length === 0) return null;
  return {
    id: item.id,
    channel: item.channel === 'voz' ? 'voz' : 'texto',
    title: item.title,
    startedAt: item.startedAt,
    updatedAt: item.updatedAt,
    messages: messages.slice(-MAX_MESSAGES_PER_CONVERSATION),
    outcome: sanitizeOutcome(item.outcome),
  };
}

/** Mais recentes primeiro, no máximo `MAX_CONVERSATIONS`. */
export function capConversations(list: readonly SavedConversation[]): SavedConversation[] {
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, MAX_CONVERSATIONS);
}

export async function loadConversations(): Promise<SavedConversation[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return capConversations(data.map(sanitizeConversation).filter((c): c is SavedConversation => c !== null));
  } catch {
    return [];
  }
}

export async function saveConversations(list: readonly SavedConversation[]): Promise<void> {
  try {
    if (list.length === 0) await AsyncStorage.removeItem(HISTORY_KEY);
    else await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    // Sem armazenamento o app segue funcionando; o histórico só não sobrevive ao reinício.
  }
}
