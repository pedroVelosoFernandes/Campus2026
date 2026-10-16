import type { VoiceMode } from './config';
import { useAssistantSession, type AssistantSessionOptions } from './use-assistant-session';
import type { SuggestedAction, TranscriptMessage, VoiceStatus } from './types';

export type UseTextAssistantOptions = AssistantSessionOptions;

export interface TextAssistant {
  state: VoiceStatus;
  transcript: TranscriptMessage[];
  error: string | null;
  suggestedAction: SuggestedAction | null;
  mode: VoiceMode;
  /** Envia uma mensagem; conecta automaticamente na primeira vez. */
  sendMessage: (text: string) => Promise<void>;
  /** Conecta antecipadamente (opcional): mostra a saudação do assistente. */
  start: () => Promise<void>;
  stop: () => void;
}

/**
 * Chat por texto (tela Conversas). Usa o MESMO modelo de delegação (via `/api/assistant-text`), reducer,
 * transcrição e ferramentas da voz. O GPT-Live não aceita texto digitado.
 */
export function useTextAssistant(options: UseTextAssistantOptions = {}): TextAssistant {
  const { session, mode, start, stop, sendText } = useAssistantSession('text', options);
  return {
    state: session.status,
    transcript: session.transcript,
    error: session.error,
    suggestedAction: session.suggestedAction,
    mode,
    sendMessage: sendText,
    start,
    stop,
  };
}
