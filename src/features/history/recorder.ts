import { useEffect, useRef, useState } from 'react';

import { useSettings } from '@/features/settings';
import type { SuggestedAction, TranscriptMessage } from '@/features/voice/types';

import { createConversationId, deriveTitle } from './format';
import { upsertConversation } from './store';
import {
  MAX_MESSAGE_CHARS,
  MAX_MESSAGES_PER_CONVERSATION,
  type ConversationChannel,
  type SavedConversation,
  type SavedMessage,
} from './types';

export type BuildConversationInput = {
  id: string;
  channel: ConversationChannel;
  startedAt: string;
  /** Conversa retomada ("Continuar conversa"): as falas antigas vêm antes. */
  prior?: SavedConversation | null;
  transcript: readonly TranscriptMessage[];
  suggestedAction: SuggestedAction | null;
  now?: Date;
};

/** Só falas finais de texto entram no histórico (resultados de ferramenta não). */
export function toSavedMessages(transcript: readonly TranscriptMessage[]): SavedMessage[] {
  const messages: SavedMessage[] = [];
  for (const item of transcript) {
    if ((item.role === 'user' || item.role === 'assistant') && item.final && item.text.trim()) {
      messages.push({ role: item.role, text: item.text.trim().slice(0, MAX_MESSAGE_CHARS) });
    }
  }
  return messages;
}

/** Registro pronto para salvar, ou `null` se a pessoa ainda não falou nada nesta sessão. */
export function buildConversation(input: BuildConversationInput): SavedConversation | null {
  const fresh = toSavedMessages(input.transcript);
  if (!fresh.some((message) => message.role === 'user')) return null;
  const messages = [...(input.prior?.messages ?? []), ...fresh].slice(-MAX_MESSAGES_PER_CONVERSATION);
  const action = input.suggestedAction;
  return {
    id: input.id,
    channel: input.prior?.channel ?? input.channel,
    title: input.prior?.title ?? deriveTitle(messages, input.channel === 'voz' ? 'Conversa por voz' : 'Conversa'),
    startedAt: input.prior?.startedAt ?? input.startedAt,
    updatedAt: (input.now ?? new Date()).toISOString(),
    messages,
    outcome: action
      ? { kind: action.kind, label: action.label, ...(action.emergency ? { emergency: true } : null) }
      : (input.prior?.outcome ?? null),
  };
}

export type ConversationRecorderOptions = {
  channel: ConversationChannel;
  transcript: readonly TranscriptMessage[];
  suggestedAction: SuggestedAction | null;
  prior?: SavedConversation | null;
};

/**
 * Salva a conversa no histórico local enquanto ela acontece — só com o
 * consentimento "Salvar histórico de conversas" ligado. Grava quando não há
 * fala em andamento (cada turno concluído), sempre no mesmo registro.
 */
export function useConversationRecorder({ channel, transcript, suggestedAction, prior }: ConversationRecorderOptions) {
  const enabled = useSettings().settings.privacy.saveConversationHistory;
  const [id] = useState(() => prior?.id ?? createConversationId());
  const [startedAt] = useState(() => new Date().toISOString());
  const lastSaved = useRef('');

  useEffect(() => {
    if (!enabled) return;
    const streaming = transcript.some((item) => 'final' in item && !item.final);
    if (streaming) return;
    const record = buildConversation({ id, channel, startedAt, prior, transcript, suggestedAction });
    if (!record) return;
    const signature = JSON.stringify([record.messages, record.outcome]);
    if (signature === lastSaved.current) return;
    lastSaved.current = signature;
    upsertConversation(record);
  }, [channel, enabled, id, prior, startedAt, suggestedAction, transcript]);

  return { id, enabled };
}
