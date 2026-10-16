import type { UnitSearchResult } from '@/services/health-units/types';
import type { SymptomResult } from '@/services/symptom-model/types';

/**
 * Tipos do assistente (voz e texto). Os nomes de eventos seguem a referência
 * atual da Realtime API: https://developers.openai.com/api/reference/resources/realtime/server-events
 */

export type VoiceStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'user_speaking'
  | 'thinking'
  | 'analyzing_symptoms'
  | 'searching_units'
  | 'assistant_speaking'
  | 'error';

/** Resultado de uma ferramenta, já validado. */
export type ToolResult =
  | { tool: 'analisar_sintomas'; result: SymptomResult }
  | { tool: 'buscar_unidades'; result: UnitSearchResult };

export type TranscriptMessage =
  | { id: string; role: 'user' | 'assistant'; text: string; final: boolean }
  | { id: string; role: 'analysis'; result: SymptomResult }
  | { id: string; role: 'units'; result: UnitSearchResult };

/** Tela para onde a UI pode levar a pessoa depois da conversa. */
export type SuggestedActionKind = 'vacinacao' | 'teleconsulta' | 'cuidar-saude' | 'conversas';

export interface SuggestedAction {
  kind: SuggestedActionKind;
  /** Emergência: a UI deve destacar "Ligar 192" antes de navegar. */
  emergency?: boolean;
  /** Frase curta explicando a sugestão, para o botão/cartão da UI. */
  label: string;
}

export type FunctionCallArgumentsDoneEvent = {
  type: 'response.function_call_arguments.done';
  call_id: string;
  name: string;
  arguments: string;
  item_id?: string;
  response_id?: string;
};

/** Eventos do servidor que o app trata. Outros eventos são ignorados. */
export type RealtimeServerEvent =
  | { type: 'session.created' | 'session.updated'; session?: unknown }
  | { type: 'input_audio_buffer.speech_started'; item_id: string }
  | { type: 'input_audio_buffer.speech_stopped'; item_id: string }
  | { type: 'conversation.item.input_audio_transcription.completed'; item_id: string; transcript: string }
  | { type: 'response.created'; response?: { id?: string } }
  | { type: 'response.output_audio_transcript.delta'; item_id: string; delta: string }
  | { type: 'response.output_audio_transcript.done'; item_id: string; transcript: string }
  | { type: 'response.output_text.delta'; item_id: string; delta: string }
  | { type: 'response.output_text.done'; item_id: string; text: string }
  | FunctionCallArgumentsDoneEvent
  | { type: 'output_audio_buffer.started' | 'output_audio_buffer.stopped'; response_id?: string }
  | { type: 'response.done'; response?: { status?: string } }
  | { type: 'error'; error?: { message?: string; type?: string; code?: string | null } };

export type OutputModality = 'audio' | 'text';

export type RealtimeClientEvent =
  | {
      type: 'conversation.item.create';
      item:
        | { type: 'function_call_output'; call_id: string; output: string }
        | { type: 'message'; role: 'user'; content: { type: 'input_text'; text: string }[] };
    }
  | { type: 'response.create'; response?: { output_modalities: OutputModality[] } }
  | { type: 'response.cancel' }
  | { type: 'session.update'; session: { type: 'realtime'; output_modalities: OutputModality[] } };

export interface TransportHandlers {
  onEvent: (event: RealtimeServerEvent) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

/** Abstração do canal com o GPT Live. WebRTC em produção, roteiro simulado em demo. */
export interface VoiceTransport {
  connect(handlers: TransportHandlers): Promise<void>;
  send(event: RealtimeClientEvent): void;
  setMuted(muted: boolean): void;
  disconnect(): void;
}
