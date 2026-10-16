import { readDelegationEvent } from './delegation';
import { mergeSuggestedAction, suggestActionFor, suggestionOnStop } from './suggested-action';
import { isKnownTool, SYMPTOM_TOOL_NAME, type ToolName } from './tools';
import type { LiveServerEvent, SuggestedAction, ToolResult, TranscriptMessage, VoiceStatus } from './types';

/**
 * Máquina de estados PURA da conversa (voz ou texto) sobre eventos do GPT-Live.
 * Não conhece WebRTC nem React.
 * Docs: https://developers.openai.com/api/docs/guides/live-conversations
 * Os deltas de transcrição do GPT-Live não têm item_id nem evento de fim de
 * turno: um novo turno começa quando o falante muda, e `app.turn_completed`
 * (sintético, emitido pelo app) marca o silêncio.
 */

export interface PendingTool {
  callId: string;
  name: ToolName;
}

export interface VoiceState {
  status: VoiceStatus;
  transcript: TranscriptMessage[];
  muted: boolean;
  /** Último erro (de transporte ou evento `error` do servidor). */
  error: string | null;
  /** Ferramentas pedidas pelo backend de delegação aguardando resultado. */
  pendingTools: PendingTool[];
  /** Para qual tela a UI pode levar a pessoa depois da conversa. */
  suggestedAction: SuggestedAction | null;
}

export type VoiceAction =
  | { type: 'start' }
  | { type: 'connected' }
  | { type: 'stop' }
  | { type: 'transport_error'; message: string }
  | { type: 'set_muted'; muted: boolean }
  | { type: 'user_text'; text: string }
  | { type: 'server_event'; event: LiveServerEvent }
  | { type: 'tool_result'; callId: string; outcome: ToolResult };

export const initialVoiceState: VoiceState = {
  status: 'idle',
  transcript: [],
  muted: false,
  error: null,
  pendingTools: [],
  suggestedAction: null,
};

const ACTIVE_STATUSES: readonly VoiceStatus[] = [
  'connecting',
  'listening',
  'user_speaking',
  'thinking',
  'analyzing_symptoms',
  'searching_units',
  'assistant_speaking',
];

export function isSessionActive(status: VoiceStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

type Speaker = 'user' | 'assistant';

function closeOpenMessages(transcript: TranscriptMessage[]): TranscriptMessage[] {
  if (!transcript.some((m) => (m.role === 'user' || m.role === 'assistant') && !m.final)) return transcript;
  return transcript.map((m) => ((m.role === 'user' || m.role === 'assistant') && !m.final ? { ...m, final: true } : m));
}

/** Acrescenta um delta ao turno aberto do falante ou abre um novo turno. */
export function appendSpeech(transcript: TranscriptMessage[], role: Speaker, delta: string): TranscriptMessage[] {
  const last = transcript.at(-1);
  if (last && last.role === role && !last.final) {
    return [...transcript.slice(0, -1), { ...last, text: last.text + delta }];
  }
  const closed = closeOpenMessages(transcript);
  return [...closed, { id: `${role}-${closed.length}`, role, text: delta, final: false }];
}

function toolStatus(pending: PendingTool[]): VoiceStatus | null {
  const last = pending.at(-1);
  if (!last) return null;
  return last.name === SYMPTOM_TOOL_NAME ? 'analyzing_symptoms' : 'searching_units';
}

function onTurnCompleted(state: VoiceState): VoiceState {
  const transcript = closeOpenMessages(state.transcript);
  if (state.status === 'user_speaking') return { ...state, transcript, status: 'thinking' };
  if (state.status === 'assistant_speaking') {
    return { ...state, transcript, status: toolStatus(state.pendingTools) ?? 'listening' };
  }
  return { ...state, transcript };
}

function onDelegationEvent(state: VoiceState, event: LiveServerEvent): VoiceState {
  const signal = readDelegationEvent(event);
  if (signal?.kind !== 'function_call' || !isKnownTool(signal.call.name)) return state;
  if (state.pendingTools.some((tool) => tool.callId === signal.call.call_id)) return state;
  const pendingTools = [...state.pendingTools, { callId: signal.call.call_id, name: signal.call.name }];
  const speaking = state.status === 'assistant_speaking' || state.status === 'user_speaking';
  return { ...state, pendingTools, status: speaking ? state.status : (toolStatus(pendingTools) ?? state.status) };
}

export function reduceServerEvent(state: VoiceState, event: LiveServerEvent): VoiceState {
  if (!isSessionActive(state.status)) return state;
  switch (event.type) {
    case 'session.started':
      return state.status === 'connecting' ? { ...state, status: 'listening' } : state;
    case 'session.input_transcript.delta':
      return { ...state, status: 'user_speaking', transcript: appendSpeech(state.transcript, 'user', event.delta) };
    case 'session.output_transcript.delta':
      return {
        ...state,
        status: 'assistant_speaking',
        transcript: appendSpeech(state.transcript, 'assistant', event.delta),
      };
    case 'app.turn_completed':
      return onTurnCompleted(state);
    case 'session.delegation.created':
      return state.status === 'listening' ? { ...state, status: 'thinking' } : state;
    case 'response.event':
      return onDelegationEvent(state, event);
    case 'session.input_audio.muted':
    case 'session.input_audio.unmuted':
      return { ...state, muted: event.type === 'session.input_audio.muted' };
    case 'session.closed':
      return stopState(state);
    case 'error':
      return { ...state, error: event.error?.message ?? 'Erro desconhecido no assistente' };
    default:
      return state;
  }
}

function onToolResult(state: VoiceState, callId: string, outcome: ToolResult): VoiceState {
  const pendingTools = state.pendingTools.filter((tool) => tool.callId !== callId);
  const id = `${outcome.tool}-${callId}`;
  const message: TranscriptMessage =
    outcome.tool === SYMPTOM_TOOL_NAME
      ? { id, role: 'analysis', result: outcome.result }
      : { id, role: 'units', result: outcome.result };
  const busy = state.status === 'assistant_speaking' || state.status === 'user_speaking';
  return {
    ...state,
    transcript: [...closeOpenMessages(state.transcript), message],
    pendingTools,
    status: busy ? state.status : (toolStatus(pendingTools) ?? 'thinking'),
    suggestedAction: mergeSuggestedAction(state.suggestedAction, suggestActionFor(outcome)),
  };
}

function stopState(state: VoiceState): VoiceState {
  return {
    ...state,
    status: 'idle',
    transcript: closeOpenMessages(state.transcript),
    pendingTools: [],
    muted: false,
    suggestedAction: suggestionOnStop(state.suggestedAction, state.transcript),
  };
}

export function voiceReducer(state: VoiceState, action: VoiceAction): VoiceState {
  switch (action.type) {
    case 'start':
      return isSessionActive(state.status) ? state : { ...initialVoiceState, status: 'connecting' };
    case 'connected':
      return state.status === 'connecting' ? { ...state, status: 'listening' } : state;
    case 'stop':
      return state.status === 'idle' ? state : stopState(state);
    case 'transport_error':
      return { ...state, status: 'error', error: action.message, pendingTools: [] };
    case 'set_muted':
      return { ...state, muted: action.muted };
    case 'user_text': {
      if (!isSessionActive(state.status)) return state;
      const closed = closeOpenMessages(state.transcript);
      const message: TranscriptMessage = { id: `user-${closed.length}`, role: 'user', text: action.text.trim(), final: true };
      return { ...state, transcript: [...closed, message], status: 'thinking' };
    }
    case 'server_event':
      return reduceServerEvent(state, action.event);
    case 'tool_result':
      return isSessionActive(state.status) ? onToolResult(state, action.callId, action.outcome) : state;
    default:
      return state;
  }
}
