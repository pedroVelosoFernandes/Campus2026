import { isKnownTool, SYMPTOM_TOOL_NAME, UNITS_TOOL_NAME, type ToolName } from '@/features/voice/tools';
import type { LiveClientEvent, LiveServerEvent, TransportHandlers, VoiceTransport } from '@/features/voice/types';
import { createLocalUnitFinder } from '@/services/health-units/local-finder';
import type { HealthUnitFinder } from '@/services/health-units/types';

import { MOCK_HEALTH_UNITS, MOCK_USER_LOCATION } from './health-units';
import { MOCK_SYMPTOM_ASSESSMENT, routeMockIntent, summarizeToolOutput } from './mock-intents';

export { MOCK_SYMPTOM_ASSESSMENT } from './mock-intents';

/**
 * Conversa simulada para demonstrar as telas sem chave da OpenAI
 * (EXPO_PUBLIC_VOICE_MOCK=1 ou sem EXPO_PUBLIC_API_URL). Emite os MESMOS
 * eventos do GPT-Live com delegação Responses (transcrições, envelopes
 * `response.event` com chamadas de função) e reage a `response.item.create`
 * + `response.create` como o backend real.
 * - modo `voice`: roteiro falado (febre e dor de cabeça desde anteontem);
 * - modo `text`: responde ao que a pessoa digita, por palavras-chave.
 */

export interface ScriptStep {
  delayMs: number;
  event: LiveServerEvent;
}

export type MockMode = 'voice' | 'text';

export const MOCK_SYMPTOM_CALL_ID = 'call_mock_sintomas';
export const MOCK_UNITS_CALL_ID = 'call_mock_unidades';

export const MOCK_GREETING =
  'Olá! Eu sou o Alô Saúde. Posso te ajudar a encontrar o atendimento certo no SUS. Do que você precisa?';

const { urgency, orientation, recommendedCare, warningSigns } = MOCK_SYMPTOM_ASSESSMENT;
export const MOCK_SYMPTOM_ARGS = { urgency, orientation, recommendedCare, warningSigns };

/** Fala de um dos lados, quebrada em deltas como o GPT-Live faz. */
export function says(role: 'user' | 'assistant', text: string, gap: number, mode: MockMode = 'voice'): ScriptStep[] {
  const type = role === 'user' ? 'session.input_transcript.delta' : 'session.output_transcript.delta';
  const steps: ScriptStep[] = text.split(' ').map((word, index) => ({
    delayMs: index === 0 ? gap : gap / 6,
    event: { type, delta: index === 0 ? word : ` ${word}` },
  }));
  // No modo texto o transporte marca o fim do turno; na voz quem marca é o silêncio (hook).
  if (mode === 'text') steps.push({ delayMs: 0, event: { type: 'app.turn_completed' } });
  return steps;
}

const nested = (event: Record<string, unknown> & { type: string }): LiveServerEvent => ({
  type: 'response.event',
  delegation_id: 'deleg_mock',
  event,
});

/** Uma rodada do backend de delegação pedindo ferramentas ao app. */
export function delegates(calls: { callId: string; name: ToolName; args: unknown }[], gap: number): ScriptStep[] {
  return [
    { delayMs: gap, event: { type: 'session.delegation.created', delegation: { id: 'deleg_mock', target: 'responses' } } },
    { delayMs: gap / 2, event: nested({ type: 'response.created', response: { id: 'resp_mock' } }) },
    ...calls.map(({ callId, name, args }) => ({
      delayMs: gap,
      event: nested({
        type: 'response.output_item.done',
        item: { type: 'function_call', call_id: callId, name, arguments: JSON.stringify(args) },
      }),
    })),
    { delayMs: gap / 2, event: nested({ type: 'response.completed', response: { output: [] } }) },
  ];
}

/** Roteiro de voz até o backend pedir a avaliação de sintomas. */
export function buildIntroScript(gap: number, mode: MockMode = 'voice'): ScriptStep[] {
  const started: ScriptStep = { delayMs: gap, event: { type: 'session.started', session: { id: 'sess_mock' } } };
  // No chat, a tela já mostra a saudação; o assistente só responde ao que for digitado.
  if (mode === 'text') return [started];
  return [
    started,
    ...says('assistant', MOCK_GREETING, gap),
    ...says('user', 'Tô com febre e dor de cabeça desde anteontem.', gap * 3),
    ...says('assistant', 'Entendi. A febre passou de 38 graus? E a dor é leve, moderada ou forte?', gap * 3),
    ...says('user', 'Chegou a 38, e a dor é moderada. Não tenho falta de ar.', gap * 3),
    ...says('assistant', 'Certo, um momento que vou verificar.', gap * 3),
    ...delegates([{ callId: MOCK_SYMPTOM_CALL_ID, name: SYMPTOM_TOOL_NAME, args: MOCK_SYMPTOM_ARGS }], gap),
  ];
}

export function createMockVoiceTransport(options: { stepDelayMs?: number; mode?: MockMode } = {}): VoiceTransport {
  const gap = options.stepDelayMs ?? 600;
  const mode = options.mode ?? 'voice';
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const calls = new Map<string, ToolName>();
  const outputs: { callId: string; name: ToolName; output: string }[] = [];
  let handlers: TransportHandlers | null = null;
  let counter = 0;

  function play(steps: ScriptStep[]) {
    let elapsed = 0;
    for (const step of steps) {
      elapsed += step.delayMs;
      const { event } = step;
      if (event.type === 'response.event' && event.event.type === 'response.output_item.done') {
        const item = (event.event as { item: { call_id: string; name: string } }).item;
        if (isKnownTool(item.name)) calls.set(item.call_id, item.name);
      }
      const timer = setTimeout(() => {
        timers.delete(timer);
        handlers?.onEvent(event);
      }, elapsed);
      timers.add(timer);
    }
  }

  function continueAfterTools() {
    // No roteiro de voz, depois da avaliação o backend busca as UBS indicadas.
    const last = outputs.at(-1);
    if (mode === 'voice' && last?.callId === MOCK_SYMPTOM_CALL_ID) {
      return play(delegates([{ callId: MOCK_UNITS_CALL_ID, name: UNITS_TOOL_NAME, args: { servico: 'ubs' } }], gap));
    }
    const answer = outputs.map(({ name, output }) => summarizeToolOutput(name, output)).join(' ');
    outputs.length = 0;
    play(says('assistant', answer, gap, mode));
  }

  function answerText(text: string) {
    const intent = routeMockIntent(text);
    if (intent.kind === 'reply') return play(says('assistant', intent.text, gap, mode));
    const callId = `call_mock_${++counter}`;
    play([...says('assistant', intent.preface, gap, mode), ...delegates([{ callId, name: intent.name, args: intent.args }], gap)]);
  }

  return {
    async connect(next) {
      handlers = next;
      play(buildIntroScript(gap, mode));
    },
    send(event: LiveClientEvent) {
      if (event.type === 'response.item.create') {
        const name = calls.get(event.item.call_id);
        if (name) outputs.push({ callId: event.item.call_id, name, output: event.item.output });
      } else if (event.type === 'response.create') {
        continueAfterTools();
      } else if (event.type === 'app.user_text') {
        answerText(event.text);
      } else if (event.type === 'session.close') {
        play([{ delayMs: gap / 2, event: { type: 'session.closed', reason: 'close_requested' } }]);
      }
    },
    setMuted() {},
    async disconnect() {
      timers.forEach(clearTimeout);
      timers.clear();
      calls.clear();
      outputs.length = 0;
      handlers = null;
    },
  };
}

export function createMockUnitFinder(): HealthUnitFinder {
  return createLocalUnitFinder(MOCK_HEALTH_UNITS);
}

/** Localização fictícia usada no modo demo. */
export async function getMockCoordinates() {
  return MOCK_USER_LOCATION;
}
