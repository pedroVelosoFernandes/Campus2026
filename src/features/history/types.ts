import type { SuggestedActionKind } from '@/features/voice/types';

/**
 * Histórico de conversas (opcional, LGPD): só é gravado quando a pessoa liga
 * "Salvar histórico de conversas" em Perfil > Privacidade. Fica apenas neste
 * aparelho (AsyncStorage) e pode ser apagado a qualquer momento.
 */

export type ConversationChannel = 'texto' | 'voz';

export type SavedMessage = { role: 'user' | 'assistant'; text: string };

/** Próximo passo sugerido ao fim da conversa (o "desfecho"). */
export type ConversationOutcome = { kind: SuggestedActionKind; label: string; emergency?: boolean };

export type SavedConversation = {
  id: string;
  channel: ConversationChannel;
  /** Derivado da primeira mensagem da pessoa. */
  title: string;
  /** ISO 8601. */
  startedAt: string;
  updatedAt: string;
  messages: SavedMessage[];
  outcome: ConversationOutcome | null;
};

/** Limites para o histórico não crescer sem fim no aparelho. */
export const MAX_CONVERSATIONS = 50;
export const MAX_MESSAGES_PER_CONVERSATION = 200;
export const MAX_MESSAGE_CHARS = 4000;
