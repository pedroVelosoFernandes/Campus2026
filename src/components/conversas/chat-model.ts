import type { SuggestedAction, TranscriptMessage, VoiceStatus } from '@/features/voice';

/** Regras puras da tela de conversa (sem React), testáveis isoladamente. */

export type ChatMessage = { id: string; role: 'assistant' | 'user'; text: string; final: boolean };

export const SYMPTOMS_GREETING = 'O que você está sentindo e há quanto tempo?';
export const DEFAULT_GREETING = 'Olá! Como posso ajudar você hoje?';

/** Saudação local exibida antes da primeira mensagem (o modo texto não envia saudação). */
export function greetingFor(topic: string | string[] | undefined): ChatMessage {
  const value = Array.isArray(topic) ? topic[0] : topic;
  const text = value === 'sintomas' ? SYMPTOMS_GREETING : DEFAULT_GREETING;
  return { id: 'local_greeting', role: 'assistant', text, final: true };
}

/** Só as falas de texto viram balões; resultados de ferramentas aparecem como cartão de ação. */
export function toChatMessages(transcript: readonly TranscriptMessage[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const item of transcript) {
    if ((item.role === 'assistant' || item.role === 'user') && item.text.trim()) {
      messages.push({ id: item.id, role: item.role, text: item.text, final: item.final });
    }
  }
  return messages;
}

// Palavras interrogativas que pedem resposta aberta, não "sim" ou "não".
const OPEN_QUESTION =
  /\b(o que|que tipo|qual|quais|quando|onde|como|quanto|quantos|quantas|quem|por que|porque|pra que|para que)\b|\bou\b/i;

/** Última frase do texto (a pergunta final de uma resposta com várias frases). */
function lastSentence(text: string): string {
  const parts = text.trim().split(/(?<=[.!?])\s+/);
  return parts[parts.length - 1] ?? '';
}

/** Verdadeiro quando o texto termina numa pergunta fechada (ex.: "Você está com febre?"). */
export function isYesNoQuestion(text: string): boolean {
  const sentence = lastSentence(text);
  if (!sentence.endsWith('?')) return false;
  return !OPEN_QUESTION.test(sentence);
}

/** Mostra "Sim" / "Não" quando a última fala é uma pergunta fechada do assistente. */
export function shouldShowQuickReplies(messages: readonly ChatMessage[], busy: boolean): boolean {
  const last = messages[messages.length - 1];
  return !busy && !!last && last.role === 'assistant' && last.final && isYesNoQuestion(last.text);
}

const BUSY: readonly VoiceStatus[] = ['connecting', 'thinking', 'analyzing_symptoms', 'searching_units'];

/** "Digitando…": o assistente está pensando e ainda não começou a escrever a resposta. */
export function isAssistantTyping(status: VoiceStatus, messages: readonly ChatMessage[]): boolean {
  const last = messages[messages.length - 1];
  const streaming = !!last && last.role === 'assistant' && !last.final;
  return BUSY.includes(status) && !streaming;
}

export type ActionRoute = '/vacinacao' | '/teleconsulta' | '/cuidar-saude';

/** Rota da sugestão; `conversas` não tem destino porque a pessoa já está aqui. */
export function routeForAction(action: SuggestedAction): ActionRoute | null {
  switch (action.kind) {
    case 'vacinacao':
      return '/vacinacao';
    case 'teleconsulta':
      return '/teleconsulta';
    case 'cuidar-saude':
      return '/cuidar-saude';
    default:
      return null;
  }
}
