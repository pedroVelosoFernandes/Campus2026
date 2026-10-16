import type { VoiceStatus } from '@/features/voice';

export type StatusCopy = {
  title: string;
  subtitle: string;
};

const LISTENING: StatusCopy = {
  title: 'Ouvindo você',
  subtitle: 'Você pode falar naturalmente.'
};

const COPY: Record<VoiceStatus, StatusCopy> = {
  idle: { title: 'Pronto para ouvir', subtitle: 'Toque no microfone para começar.' },
  connecting: { title: 'Conectando…', subtitle: 'Preparando o assistente.' },
  listening: LISTENING,
  user_speaking: LISTENING,
  thinking: { title: 'Analisando…', subtitle: 'Só um instante.' },
  analyzing_symptoms: { title: 'Analisando…', subtitle: 'Avaliando o que você contou.' },
  searching_units: {
    title: 'Buscando unidades…',
    subtitle: 'Procurando atendimento perto de você.' },
  assistant_speaking: {
    title: 'Respondendo',
    subtitle: 'Você pode interromper quando quiser.' },
  closing: { title: 'Encerrando…', subtitle: 'Finalizando a conversa.' },
  error: {
    title: 'Não foi possível conectar',
    subtitle: 'Verifique sua internet e tente de novo.' },
};

const MUTED: StatusCopy = {
  title: 'Microfone desligado',
  subtitle: 'Toque em “Mudo” para voltar a falar.'
};

/**
 * O orbe e as barras só se movem enquanto o assistente fala (áudio de saída
 * ativo); nos demais estados ficam parados, em repouso.
 */
export function isAssistantSpeaking(state: VoiceStatus): boolean {
  return state === 'assistant_speaking';
}

/** Título e subtítulo da tela do assistente para cada estado da conversa. */
export function statusCopy(state: VoiceStatus, muted: boolean): StatusCopy {
  if (muted && (state === 'listening' || state === 'user_speaking')) return MUTED;
  return COPY[state];
}
