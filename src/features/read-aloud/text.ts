import type { TranscriptMessage } from '@/features/voice/types';

type SpokenMessage = { id: string; role: 'assistant'; text: string; final: boolean };

const isFinalAssistant = (message: TranscriptMessage): message is SpokenMessage =>
  message.role === 'assistant' && message.final && message.text.trim().length > 0;

/** Ids das respostas do assistente já concluídas. */
export function finalAssistantIds(transcript: readonly TranscriptMessage[]): string[] {
  return transcript.filter(isFinalAssistant).map((message) => message.id);
}

/** Respostas concluídas que ainda não foram lidas (na ordem da conversa). */
export function unreadAssistantMessages(
  transcript: readonly TranscriptMessage[],
  handled: ReadonlySet<string>,
): SpokenMessage[] {
  return transcript.filter(isFinalAssistant).filter((message) => !handled.has(message.id));
}

/** Id da última mensagem da pessoa (muda quando ela envia algo novo). */
export function latestUserId(transcript: readonly TranscriptMessage[]): string | null {
  for (let i = transcript.length - 1; i >= 0; i -= 1) {
    if (transcript[i].role === 'user') return transcript[i].id;
  }
  return null;
}

/**
 * Deixa o texto bom de ouvir: tira marcações de formatação e endereços web,
 * que o leitor soletraria, e junta os espaços.
 */
export function toSpeakableText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*_#`>~]+/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}
