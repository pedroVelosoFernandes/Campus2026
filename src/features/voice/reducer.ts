import { mergeSuggestedAction, suggestActionFor, suggestionOnStop } from './suggested-action';
import { isKnownTool, SYMPTOM_TOOL_NAME, type ToolName } from './tools';
import type { RealtimeServerEvent, SuggestedAction, ToolResult, TranscriptMessage, VoiceStatus } from './types';

/**
 * Máquina de estados PURA da conversa (voz ou texto). Não conhece WebRTC nem
 * React: recebe eventos do servidor Realtime e ações do app e devolve o novo estado.
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
  /** Áudio do assistente ainda tocando (WebRTC: output_audio_buffer.*). */
  audioPlaying: boolean;
  /** Ferramentas chamadas pelo GPT Live aguardando resultado. */
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
  | { type: 'user_text'; id: string; text: string }
  | { type: 'server_event'; event: RealtimeServerEvent }
  | { type: 'tool_result'; callId: string; outcome: ToolResult };

export const initialVoiceState: VoiceState = {
  status: 'idle',
  transcript: [],
  muted: false,
  error: null,
  audioPlaying: false,
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

type TextMessage = Extract<TranscriptMessage, { role: 'user' | 'assistant' }>;

function upsertText(
  transcript: TranscriptMessage[],
  id: string,
  role: TextMessage['role'],
  update: (previous: TextMessage | undefined) => Pick<TextMessage, 'text' | 'final'>,
): TranscriptMessage[] {
  const index = transcript.findIndex((message) => message.id === id);
  const previous = index >= 0 ? transcript[index] : undefined;
  const base = previous && (previous.role === 'user' || previous.role === 'assistant') ? previous : undefined;
  const next: TextMessage = { id, role, ...update(base) };
  if (index < 0) return [...transcript, next];
  return transcript.map((message, i) => (i === index ? next : message));
}

function toolStatus(pending: PendingTool[]): VoiceStatus | null {
  const last = pending.at(-1);
  if (!last) return null;
  return last.name === SYMPTOM_TOOL_NAME ? 'analyzing_symptoms' : 'searching_units';
}

/** Status de "repouso" quando nada está acontecendo do lado do assistente. */
function settledStatus(state: VoiceState): VoiceStatus {
  return toolStatus(state.pendingTools) ?? (state.audioPlaying ? 'assistant_speaking' : 'listening');
}

type EventOf<T extends RealtimeServerEvent['type']> = Extract<RealtimeServerEvent, { type: T }>;

function onSpeechStarted(state: VoiceState, event: EventOf<'input_audio_buffer.speech_started'>): VoiceState {
  return {
    ...state,
    status: 'user_speaking',
    audioPlaying: false,
    transcript: upsertText(state.transcript, event.item_id, 'user', (prev) => ({
      text: prev?.text ?? '',
      final: false,
    })),
  };
}

function onUserTranscript(
  state: VoiceState,
  event: EventOf<'conversation.item.input_audio_transcription.completed'>,
): VoiceState {
  const transcript = upsertText(state.transcript, event.item_id, 'user', () => ({
    text: event.transcript.trim(),
    final: true,
  }));
  return { ...state, transcript };
}

function onAssistantDelta(state: VoiceState, itemId: string, delta: string): VoiceState {
  return {
    ...state,
    status: toolStatus(state.pendingTools) ?? 'assistant_speaking',
    transcript: upsertText(state.transcript, itemId, 'assistant', (prev) => ({
      text: (prev?.text ?? '') + delta,
      final: false,
    })),
  };
}

function onAssistantDone(state: VoiceState, itemId: string, text: string): VoiceState {
  const transcript = upsertText(state.transcript, itemId, 'assistant', (prev) => ({
    text: text || prev?.text || '',
    final: true,
  }));
  return { ...state, transcript };
}

function onFunctionCall(state: VoiceState, event: EventOf<'response.function_call_arguments.done'>): VoiceState {
  if (!isKnownTool(event.name)) return state;
  const pendingTools = [...state.pendingTools, { callId: event.call_id, name: event.name }];
  return { ...state, pendingTools, status: toolStatus(pendingTools) ?? state.status };
}

function onAudioBuffer(state: VoiceState, playing: boolean): VoiceState {
  const next = { ...state, audioPlaying: playing };
  if (state.status === 'user_speaking') return next;
  if (playing) return { ...next, status: toolStatus(state.pendingTools) ?? 'assistant_speaking' };
  return state.status === 'assistant_speaking' ? { ...next, status: settledStatus(next) } : next;
}

export function reduceServerEvent(state: VoiceState, event: RealtimeServerEvent): VoiceState {
  if (!isSessionActive(state.status)) return state;
  switch (event.type) {
    case 'session.created':
      return state.status === 'connecting' ? { ...state, status: 'listening' } : state;
    case 'input_audio_buffer.speech_started':
      return onSpeechStarted(state, event);
    case 'input_audio_buffer.speech_stopped':
      return { ...state, status: toolStatus(state.pendingTools) ?? 'thinking' };
    case 'conversation.item.input_audio_transcription.completed':
      return onUserTranscript(state, event);
    case 'response.created':
      return state.status === 'listening' ? { ...state, status: 'thinking' } : state;
    case 'response.output_audio_transcript.delta':
    case 'response.output_text.delta':
      return onAssistantDelta(state, event.item_id, event.delta);
    case 'response.output_audio_transcript.done':
      return onAssistantDone(state, event.item_id, event.transcript);
    case 'response.output_text.done':
      return onAssistantDone(state, event.item_id, event.text);
    case 'response.function_call_arguments.done':
      return onFunctionCall(state, event);
    case 'output_audio_buffer.started':
    case 'output_audio_buffer.stopped':
      return onAudioBuffer(state, event.type === 'output_audio_buffer.started');
    case 'response.done':
      return state.status === 'user_speaking' ? state : { ...state, status: settledStatus(state) };
    case 'error':
      return { ...state, error: event.error?.message ?? 'Erro desconhecido no servidor de voz' };
    default:
      return state;
  }
}

function onToolResult(state: VoiceState, callId: string, outcome: ToolResult): VoiceState {
  const pendingTools = state.pendingTools.filter((tool) => tool.callId !== callId);
  const id = `${outcome.tool}-${callId}`;
  const message: TranscriptMessage =
    outcome.tool === 'analisar_sintomas'
      ? { id, role: 'analysis', result: outcome.result }
      : { id, role: 'units', result: outcome.result };
  return {
    ...state,
    transcript: [...state.transcript, message],
    pendingTools,
    status: toolStatus(pendingTools) ?? 'thinking',
    suggestedAction: mergeSuggestedAction(state.suggestedAction, suggestActionFor(outcome)),
  };
}

function onUserText(state: VoiceState, id: string, text: string): VoiceState {
  const transcript = upsertText(state.transcript, id, 'user', () => ({ text: text.trim(), final: true }));
  return { ...state, transcript, status: toolStatus(state.pendingTools) ?? 'thinking' };
}

export function voiceReducer(state: VoiceState, action: VoiceAction): VoiceState {
  switch (action.type) {
    case 'start':
      return isSessionActive(state.status) ? state : { ...initialVoiceState, status: 'connecting' };
    case 'connected':
      return state.status === 'connecting' ? { ...state, status: 'listening' } : state;
    case 'stop':
      return {
        ...state,
        status: 'idle',
        audioPlaying: false,
        pendingTools: [],
        muted: false,
        suggestedAction: suggestionOnStop(state.suggestedAction, state.transcript),
      };
    case 'transport_error':
      return { ...state, status: 'error', error: action.message, audioPlaying: false, pendingTools: [] };
    case 'set_muted':
      return { ...state, muted: action.muted };
    case 'user_text':
      return isSessionActive(state.status) ? onUserText(state, action.id, action.text) : state;
    case 'server_event':
      return reduceServerEvent(state, action.event);
    case 'tool_result':
      return isSessionActive(state.status) ? onToolResult(state, action.callId, action.outcome) : state;
    default:
      return state;
  }
}
