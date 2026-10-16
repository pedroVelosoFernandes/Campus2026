import type { FetchLike } from '@/services/symptom-model/types';
import { MAX_TEXT_ITEMS, type TextTurnItem, type TextTurnResponse } from '@/services/text-assistant/protocol';

import type { LiveClientEvent, LiveServerEvent, TransportHandlers, VoiceTransport } from '../types';

/**
 * Transporte do modo TEXTO. O GPT-Live não aceita texto digitado, então cada
 * turno chama a rota `/api/assistant-text` (mesmo modelo de delegação e mesmas
 * ferramentas). Para reaproveitar reducer, transcrição e execução de
 * ferramentas, este transporte traduz as respostas para os MESMOS eventos do
 * GPT-Live (`session.output_transcript.delta`, envelopes `response.event`).
 */

export const TEXT_FALLBACK_REPLY =
  'Não consegui responder agora. Tente de novo em instantes. Se for urgente, ligue 192 (SAMU); ' +
  'para informações, ligue 136 (Disque Saúde).';

export interface TextTransportOptions {
  apiUrl: string;
  fetchImpl?: FetchLike;
}

/** Mantém o histórico dentro do limite, sem começar por uma resposta de ferramenta órfã. */
export function trimHistory(history: TextTurnItem[]): TextTurnItem[] {
  if (history.length <= MAX_TEXT_ITEMS) return history;
  const recent = history.slice(-MAX_TEXT_ITEMS);
  const firstUser = recent.findIndex((item) => 'role' in item && item.role === 'user');
  return firstUser > 0 ? recent.slice(firstUser) : recent;
}

function responseEvent(event: Record<string, unknown> & { type: string }): LiveServerEvent {
  return { type: 'response.event', event };
}

export function createTextTransport(options: TextTransportOptions): VoiceTransport {
  const doFetch: FetchLike = options.fetchImpl ?? ((url, init) => fetch(url, init));
  const endpoint = `${options.apiUrl.replace(/\/+$/, '')}/api/assistant-text`;
  let handlers: TransportHandlers | null = null;
  let history: TextTurnItem[] = [];
  let controller: AbortController | null = null;

  const emit = (event: LiveServerEvent) => handlers?.onEvent(event);

  async function fetchTurn(signal: AbortSignal): Promise<TextTurnResponse> {
    const response = await doFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: history }),
      signal,
    });
    if (!response.ok) throw new Error(`assistant-text respondeu ${response.status}`);
    return (await response.json()) as TextTurnResponse;
  }

  function emitTurn(turn: TextTurnResponse) {
    emit(responseEvent({ type: 'response.created' }));
    if (turn.text) {
      history.push({ role: 'assistant', content: turn.text });
      emit({ type: 'session.output_transcript.delta', delta: turn.text });
    }
    for (const call of turn.calls) {
      history.push({ type: 'function_call', ...call });
      emit(responseEvent({ type: 'response.output_item.done', item: { type: 'function_call', ...call } }));
    }
    emit(responseEvent({ type: 'response.completed' }));
    if (turn.calls.length === 0) emit({ type: 'app.turn_completed' });
  }

  async function runTurn() {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    history = trimHistory(history);
    try {
      emitTurn(await fetchTurn(current.signal));
    } catch (error) {
      if (current.signal.aborted) return;
      emit({ type: 'error', error: { message: error instanceof Error ? error.message : 'Falha no chat' } });
      emit({ type: 'session.output_transcript.delta', delta: TEXT_FALLBACK_REPLY });
      emit({ type: 'app.turn_completed' });
    }
  }

  return {
    async connect(next) {
      handlers = next;
      history = [];
      emit({ type: 'session.started' });
    },
    send(event: LiveClientEvent) {
      if (event.type === 'app.user_text') {
        history.push({ role: 'user', content: event.text });
        void runTurn();
      } else if (event.type === 'response.item.create') {
        history.push({ type: 'function_call_output', call_id: event.item.call_id, output: event.item.output });
      } else if (event.type === 'response.create') {
        void runTurn();
      }
    },
    setMuted() {},
    async disconnect() {
      controller?.abort();
      controller = null;
      handlers = null;
      history = [];
    },
  };
}
