import type { VoiceStatus } from '@/features/voice';

/** Intensidade da animação das barras de áudio e do orbe. */
export type VoiceActivity = 'lively' | 'pulse' | 'calm';

export type StatusCopy = {
  title: string;
  subtitle: string;
  activity: VoiceActivity;
};

const LISTENING: StatusCopy = {
  title: 'Ouvindo você',
  subtitle: 'Você pode falar naturalmente.',
  activity: 'lively',
};

const COPY: Record<VoiceStatus, StatusCopy> = {
  idle: { title: 'Pronto para ouvir', subtitle: 'Toque no microfone para começar.', activity: 'calm' },
  connecting: { title: 'Conectando…', subtitle: 'Preparando o assistente.', activity: 'calm' },
  listening: LISTENING,
  user_speaking: LISTENING,
  thinking: { title: 'Analisando…', subtitle: 'Só um instante.', activity: 'pulse' },
  analyzing_symptoms: { title: 'Analisando…', subtitle: 'Avaliando o que você contou.', activity: 'pulse' },
  searching_units: {
    title: 'Buscando unidades…',
    subtitle: 'Procurando atendimento perto de você.',
    activity: 'pulse',
  },
  assistant_speaking: {
    title: 'Respondendo',
    subtitle: 'Você pode interromper quando quiser.',
    activity: 'lively',
  },
  closing: { title: 'Encerrando…', subtitle: 'Finalizando a conversa.', activity: 'calm' },
  error: {
    title: 'Não foi possível conectar',
    subtitle: 'Verifique sua internet e tente de novo.',
    activity: 'calm',
  },
};

const MUTED: StatusCopy = {
  title: 'Microfone desligado',
  subtitle: 'Toque em “Mudo” para voltar a falar.',
  activity: 'calm',
};

/** Título, subtítulo e animação da tela do assistente para cada estado da conversa. */
export function statusCopy(state: VoiceStatus, muted: boolean): StatusCopy {
  if (muted && (state === 'listening' || state === 'user_speaking')) return MUTED;
  return COPY[state];
}
