import type { FunctionCallItem, LiveClientEvent, LiveServerEvent } from './types';

/**
 * Interpretação PURA dos envelopes `response.event` da delegação Responses.
 * Docs: https://developers.openai.com/api/docs/guides/live-delegation
 * - chamadas de função vêm em `response.output_item.done` aninhado (item com call_id/name/arguments);
 * - o fim de cada resposta do backend vem em `response.completed|failed|incomplete`.
 */

export type DelegationSignal =
  | { kind: 'response_started' }
  | { kind: 'function_call'; call: FunctionCallItem }
  | { kind: 'response_finished' };

const FINISHED = new Set(['response.completed', 'response.failed', 'response.incomplete']);

export function readDelegationEvent(event: LiveServerEvent): DelegationSignal | null {
  if (event.type !== 'response.event' || !event.event) return null;
  const nested = event.event;
  if (nested.type === 'response.created') return { kind: 'response_started' };
  if (FINISHED.has(nested.type)) return { kind: 'response_finished' };
  if (nested.type !== 'response.output_item.done') return null;
  const item = (nested as { item?: Partial<FunctionCallItem> & { type?: string } }).item;
  if (item?.type !== 'function_call' || !item.call_id || !item.name) return null;
  return {
    kind: 'function_call',
    call: { type: 'function_call', call_id: item.call_id, name: item.name, arguments: item.arguments ?? '{}' },
  };
}

/**
 * Coordena a devolução dos resultados: um `response.item.create` por chamada
 * e UM `response.create` só quando a resposta do backend terminou e todas as
 * chamadas pendentes já têm resultado (senão: `tool_outputs_required`).
 */
export interface ToolBatcher {
  responseStarted(): void;
  callStarted(callId: string): void;
  submit(callId: string, output: string): void;
  responseFinished(): void;
  reset(): void;
}

export function createToolBatcher(send: (event: LiveClientEvent) => void, nextEventId: () => string): ToolBatcher {
  const outstanding = new Set<string>();
  let submitted = 0;
  let responseDone = false;

  function maybeContinue() {
    if (!responseDone || outstanding.size > 0 || submitted === 0) return;
    submitted = 0;
    responseDone = false;
    send({ type: 'response.create', event_id: nextEventId() });
  }

  return {
    responseStarted() {
      responseDone = false;
    },
    callStarted(callId) {
      outstanding.add(callId);
    },
    submit(callId, output) {
      if (!outstanding.delete(callId)) return; // resultado duplicado ou de sessão antiga
      send({
        type: 'response.item.create',
        event_id: nextEventId(),
        item: { type: 'function_call_output', call_id: callId, output },
      });
      submitted += 1;
      maybeContinue();
    },
    responseFinished() {
      responseDone = true;
      maybeContinue();
    },
    reset() {
      outstanding.clear();
      submitted = 0;
      responseDone = false;
    },
  };
}

export function createEventIdFactory(prefix = 'evt_app') {
  let counter = 0;
  return () => `${prefix}_${Date.now().toString(36)}_${++counter}`;
}
