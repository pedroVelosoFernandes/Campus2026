import type { VoiceMode } from './config';
import { useAssistantSession, type AssistantSessionOptions } from './use-assistant-session';
import type { SuggestedAction, TranscriptMessage, VoiceStatus } from './types';

export type UseVoiceAssistantOptions = AssistantSessionOptions;

export interface VoiceAssistant {
  state: VoiceStatus;
  transcript: TranscriptMessage[];
  muted: boolean;
  error: string | null;
  /** Tela sugerida após a conversa (vacinação, teleconsulta, cuidar da saúde...). */
  suggestedAction: SuggestedAction | null;
  mode: VoiceMode;
  start: () => Promise<void>;
  stop: () => void;
  /** Sem argumento alterna; com argumento define o estado do microfone. */
  mute: (muted?: boolean) => void;
  /** Permite digitar durante a conversa por voz (a resposta continua falada). */
  sendText: (text: string) => Promise<void>;
}

/** Conversa por voz com o GPT Live (WebRTC) ou com o roteiro simulado. */
export function useVoiceAssistant(options: UseVoiceAssistantOptions = {}): VoiceAssistant {
  const { session, mode, start, stop, mute, sendText } = useAssistantSession('voice', options);
  return {
    state: session.status,
    transcript: session.transcript,
    muted: session.muted,
    error: session.error,
    suggestedAction: session.suggestedAction,
    mode,
    start,
    stop,
    mute,
    sendText,
  };
}
