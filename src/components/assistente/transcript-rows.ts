import type { TranscriptMessage } from '@/features/voice';

import type { BubbleVariant } from './TranscriptBubble';

export type SpokenMessage = Extract<TranscriptMessage, { role: 'user' | 'assistant' }>;

/** Só falas com texto viram balão (análises e unidades aparecem em outras telas). */
export function isSpoken(message: TranscriptMessage): message is SpokenMessage {
  return (message.role === 'user' || message.role === 'assistant') && message.text.trim().length > 0;
}

/** Variante visual do balão; a fala da pessoa ainda em captura fica destacada. */
export function bubbleVariant(message: SpokenMessage, userSpeaking: boolean): BubbleVariant {
  if (message.role === 'assistant') return 'assistant';
  return userSpeaking && !message.final ? 'user-live' : 'user';
}
