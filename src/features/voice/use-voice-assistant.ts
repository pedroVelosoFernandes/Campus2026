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
  /** Encerra a sessão (`session.close`); a transcrição continua disponível. */
  stop: () => void;
  /** Sem argumento alterna; com argumento define o estado do microfone. */
  mute: (muted?: boolean) => void;
}

/** Conversa por voz com o GPT-Live (WebRTC) ou com o roteiro simulado. */
export function useVoiceAssistant(options: UseVoiceAssistantOptions = {}): VoiceAssistant {
  const { session, mode, start, stop, mute } = useAssistantSession('voice', options);
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
  };
}
