import type { UnitSearchResult } from '@/services/health-units/types';
import type { SymptomResult } from '@/services/symptom-model/types';

/**
 * Tipos do assistente (voz e texto) sobre o GPT-Live com delegação Responses.
 * Docs: https://developers.openai.com/api/docs/guides/live-conversations
 *       https://developers.openai.com/api/docs/guides/live-delegation
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
  /** Reservado: encerramento em andamento (session.close enviado). */
  | 'closing'
  | 'error';

/** Resultado de uma ferramenta do app, já validado. */
export type ToolResult =
  | { tool: 'registrar_orientacao_sintomas'; result: SymptomResult }
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

/** Chamada de função feita pelo backend de delegação (item `function_call`). */
export interface FunctionCallItem {
  type: 'function_call';
  call_id: string;
  name: string;
  arguments: string;
  id?: string;
}

/** Evento Responses aninhado dentro do envelope `response.event`. */
export type NestedResponseEvent =
  | { type: 'response.created'; response?: { id?: string } }
  | { type: 'response.output_item.done'; item: { type: string } & Partial<FunctionCallItem> }
  | { type: 'response.completed' | 'response.failed' | 'response.incomplete'; response?: unknown }
  | { type: string; [key: string]: unknown };

/** Eventos do servidor GPT-Live que o app trata. Outros eventos são ignorados. */
export type LiveServerEvent =
  | { type: 'session.started'; session?: { id?: string } }
  | { type: 'session.closed'; reason?: string; usage?: { seconds?: number } }
  | { type: 'session.input_transcript.delta'; delta: string; start_ms?: number; end_ms?: number }
  | { type: 'session.output_transcript.delta'; delta: string; start_ms?: number; end_ms?: number }
  | { type: 'session.delegation.created'; delegation?: { id?: string; target?: string; response_id?: string } }
  | { type: 'response.event'; delegation_id?: string; event: NestedResponseEvent }
  | { type: 'session.input_audio.muted' | 'session.input_audio.unmuted' }
  | { type: 'error'; error?: { message?: string; type?: string; code?: string | null; client_event_id?: string } }
  /**
   * Evento SINTÉTICO do app (não vem da OpenAI): o GPT-Live não marca fim de
   * turno, então o hook (silêncio) ou o transporte de texto o emitem.
   */
  | { type: 'app.turn_completed' };

/** Comandos enviados ao GPT-Live pelo canal `oai-events`. */
export type LiveClientEvent =
  | {
      type: 'response.item.create';
      event_id: string;
      item: { type: 'function_call_output'; call_id: string; output: string };
    }
  | { type: 'response.create'; event_id: string }
  | { type: 'session.close'; event_id: string }
  | { type: 'session.input_audio.mute' | 'session.input_audio.unmute'; event_id: string }
  /** Comando LOCAL do modo texto (não existe no GPT-Live): mensagem digitada. */
  | { type: 'app.user_text'; event_id: string; text: string };

export interface TransportHandlers {
  onEvent: (event: LiveServerEvent) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

/** Canal com o assistente: GPT-Live (WebRTC), rota de texto ou roteiro simulado. */
export interface VoiceTransport {
  /** Resolve quando a sessão está pronta (`session.started`). */
  connect(handlers: TransportHandlers): Promise<void>;
  send(event: LiveClientEvent): void;
  setMuted(muted: boolean): void;
  /** Encerra com `session.close` e aguarda `session.closed` (com limite de tempo). */
  disconnect(): Promise<void>;
}
