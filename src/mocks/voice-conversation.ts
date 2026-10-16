import { isKnownTool, SYMPTOM_TOOL_NAME, UNITS_TOOL_NAME, type ToolName } from '@/features/voice/tools';
import type {
  RealtimeClientEvent,
  RealtimeServerEvent,
  TransportHandlers,
  VoiceTransport,
} from '@/features/voice/types';
import { createLocalUnitFinder } from '@/services/health-units/local-finder';
import type { HealthUnitFinder } from '@/services/health-units/types';
import type { SymptomAnalyzer, SymptomResult } from '@/services/symptom-model/types';

import { MOCK_HEALTH_UNITS, MOCK_USER_LOCATION } from './health-units';
import { routeMockIntent, summarizeToolOutput } from './mock-intents';

/**
 * Conversa simulada para demonstrar as telas sem chave da OpenAI
 * (EXPO_PUBLIC_VOICE_MOCK=1 ou sem EXPO_PUBLIC_API_URL). Emite os mesmos
 * eventos da Realtime API, inclusive as chamadas de ferramentas.
 * - modo `voice`: roteiro falado (febre e dor de cabeça há 2 dias);
 * - modo `text`: responde ao que a pessoa digita, por palavras-chave.
 */

export interface ScriptStep {
  delayMs: number;
  event: RealtimeServerEvent;
}

export type MockMode = 'voice' | 'text';

export const MOCK_TOOL_CALL_ID = 'call_mock_sintomas';

export const MOCK_SYMPTOM_ARGS = {
  sintomas: ['febre', 'dor de cabeça'],
  duracao: '2 dias',
  intensidade: 'moderada',
  observacoes: 'Febre de até 38 graus, sem falta de ar.',
} as const;

export const MOCK_SYMPTOM_RESULT: SymptomResult = {
  urgency: 'pouco_urgente',
  orientation:
    'Pelo que você contou, não parece uma emergência. Beba bastante água, descanse ' +
    'e procure a UBS mais próxima para avaliação. Se tiver falta de ar, manchas no corpo ou ' +
    'febre acima de 39 graus, vá a uma UPA.',
  recommendedCare: 'ubs',
  warningSigns: ['falta de ar', 'manchas vermelhas no corpo', 'febre acima de 39 °C', 'vômitos persistentes'],
  source: 'model',
};

export function assistantSays(itemId: string, text: string, gap: number, mode: MockMode): ScriptStep[] {
  const audio = mode === 'voice';
  const words = text.split(' ');
  const deltaType = audio ? 'response.output_audio_transcript.delta' : 'response.output_text.delta';
  const done: RealtimeServerEvent = audio
    ? { type: 'response.output_audio_transcript.done', item_id: itemId, transcript: text }
    : { type: 'response.output_text.done', item_id: itemId, text };
  return [
    { delayMs: gap, event: { type: 'response.created' } },
    ...(audio ? [{ delayMs: gap / 2, event: { type: 'output_audio_buffer.started' } } as ScriptStep] : []),
    ...words.map((word, index) => ({
      delayMs: gap / 6,
      event: { type: deltaType, item_id: itemId, delta: index === 0 ? word : ` ${word}` } as RealtimeServerEvent,
    })),
    { delayMs: gap / 2, event: done },
    { delayMs: 0, event: { type: 'response.done', response: { status: 'completed' } } },
    ...(audio ? [{ delayMs: gap, event: { type: 'output_audio_buffer.stopped' } } as ScriptStep] : []),
  ];
}

function userSays(itemId: string, text: string, gap: number): ScriptStep[] {
  return [
    { delayMs: gap * 2, event: { type: 'input_audio_buffer.speech_started', item_id: itemId } },
    { delayMs: gap * 3, event: { type: 'input_audio_buffer.speech_stopped', item_id: itemId } },
    {
      delayMs: gap / 2,
      event: { type: 'conversation.item.input_audio_transcription.completed', item_id: itemId, transcript: text },
    },
  ];
}

function toolCall(callId: string, name: ToolName, args: unknown, gap: number): ScriptStep[] {
  return [
    { delayMs: gap, event: { type: 'response.created' } },
    {
      delayMs: gap,
      event: { type: 'response.function_call_arguments.done', call_id: callId, name, arguments: JSON.stringify(args) },
    },
    { delayMs: 0, event: { type: 'response.done', response: { status: 'completed' } } },
  ];
}

export const MOCK_GREETING = 'Olá! Eu sou o Alô Saúde. Posso te ajudar a encontrar o atendimento certo no SUS. Do que você precisa?';

/** Roteiro de voz: saudação, relato dos sintomas e chamada de `analisar_sintomas`. */

export function buildIntroScript(gap: number, mode: MockMode = 'voice'): ScriptStep[] {
  const connected: ScriptStep = { delayMs: gap, event: { type: 'session.created' } };
  // No chat, a tela já mostra a saudação; o assistente só responde ao que for digitado.
  if (mode === 'text') return [connected];
  return [
    connected,
    ...assistantSays('mock_a1', MOCK_GREETING, gap, mode),
    ...userSays('mock_u1', 'Tô com febre e dor de cabeça desde anteontem.', gap),
    ...assistantSays('mock_a2', 'Entendi. A febre passou de 38 graus? E a dor é leve, moderada ou forte?', gap, mode),
    ...userSays('mock_u2', 'Chegou a 38, e a dor é moderada. Não tenho falta de ar.', gap),
    ...toolCall(MOCK_TOOL_CALL_ID, SYMPTOM_TOOL_NAME, MOCK_SYMPTOM_ARGS, gap),
  ];
}

export function createMockVoiceTransport(options: { stepDelayMs?: number; mode?: MockMode } = {}): VoiceTransport {
  const gap = options.stepDelayMs ?? 600;
  const mode = options.mode ?? 'voice';
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const calls = new Map<string, ToolName>();
  let handlers: TransportHandlers | null = null;
  let pendingOutput: { name: ToolName; output: string; callId: string } | null = null;
  let pendingText: string | null = null;
  let counter = 0;

  function play(steps: ScriptStep[]) {
    let elapsed = 0;
    for (const step of steps) {
      elapsed += step.delayMs;
      if (step.event.type === 'response.function_call_arguments.done' && isKnownTool(step.event.name)) {
        calls.set(step.event.call_id, step.event.name);
      }
      const timer = setTimeout(() => {
        timers.delete(timer);
        handlers?.onEvent(step.event);
      }, elapsed);
      timers.add(timer);
    }
  }

  function answerTool({ name, output, callId }: NonNullable<typeof pendingOutput>) {
    const steps = assistantSays(`mock_tool_${++counter}`, summarizeToolOutput(name, output), gap, mode);
    // No roteiro de voz, depois da análise o assistente busca as UBS indicadas.
    if (mode === 'voice' && callId === MOCK_TOOL_CALL_ID) {
      steps.push(...toolCall('call_mock_unidades', UNITS_TOOL_NAME, { servico: 'ubs' }, gap));
    }
    play(steps);
  }

  function answerText(text: string) {
    const intent = routeMockIntent(text);
    const id = `mock_${++counter}`;
    if (intent.kind === 'reply') return play(assistantSays(id, intent.text, gap, mode));
    play([...assistantSays(id, intent.preface, gap, mode), ...toolCall(`call_${id}`, intent.name, intent.args, gap)]);
  }

  return {
    async connect(next) {
      handlers = next;
      play(buildIntroScript(gap, mode));
    },
    send(event: RealtimeClientEvent) {
      if (event.type === 'conversation.item.create' && event.item.type === 'function_call_output') {
        const name = calls.get(event.item.call_id);
        if (name) pendingOutput = { name, output: event.item.output, callId: event.item.call_id };
      } else if (event.type === 'conversation.item.create' && event.item.type === 'message') {
        pendingText = event.item.content.map((part) => part.text).join(' ');
      } else if (event.type === 'response.create') {
        if (pendingOutput) answerTool(pendingOutput);
        else if (pendingText) answerText(pendingText);
        pendingOutput = null;
        pendingText = null;
      }
    },
    setMuted() {},
    disconnect() {
      timers.forEach(clearTimeout);
      timers.clear();
      calls.clear();
      handlers = null;
    },
  };
}

export function createMockSymptomAnalyzer(delayMs = 1200): SymptomAnalyzer {
  return {
    analyze: () => new Promise((resolve) => setTimeout(() => resolve(MOCK_SYMPTOM_RESULT), delayMs)),
  };
}

export function createMockUnitFinder(): HealthUnitFinder {
  return createLocalUnitFinder(MOCK_HEALTH_UNITS);
}

/** Localização fictícia usada no modo demo. */
export async function getMockCoordinates() {
  return MOCK_USER_LOCATION;
}
