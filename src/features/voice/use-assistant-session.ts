import { useCallback, useEffect, useReducer, useRef, useState, type RefObject } from 'react';

import { createVoiceDependencies, type AssistantChannel, type VoiceDependencies, type VoiceMode } from './config';
import { initialVoiceState, voiceReducer, type VoiceAction, type VoiceState } from './reducer';
import { handleToolCall, type ToolDependencies } from './tool-call';
import type { FunctionCallArgumentsDoneEvent, RealtimeClientEvent, VoiceTransport } from './types';

/**
 * Núcleo compartilhado por `useVoiceAssistant` e `useTextAssistant`: mesma
 * máquina de estados, mesma transcrição e mesmas ferramentas. Só muda o canal.
 */

export interface AssistantSessionOptions extends Partial<ToolDependencies> {
  /** Transporte injetado (ex.: mock nos testes). Se omitido, resolve pelo ambiente. */
  transport?: VoiceTransport;
}

export interface AssistantSession {
  session: VoiceState;
  mode: VoiceMode;
  start: () => Promise<void>;
  stop: () => void;
  mute: (muted?: boolean) => void;
  sendText: (text: string) => Promise<void>;
}

function resolveDependencies(channel: AssistantChannel, options: AssistantSessionOptions): VoiceDependencies {
  const { transport, analyzer, unitFinder, getCoordinates } = options;
  if (transport && analyzer && unitFinder) {
    return { mode: 'live', transport, analyzer, unitFinder, getCoordinates };
  }
  const defaults = createVoiceDependencies(channel);
  return {
    mode: transport ? 'live' : defaults.mode,
    transport: transport ?? defaults.transport,
    analyzer: analyzer ?? defaults.analyzer,
    unitFinder: unitFinder ?? defaults.unitFinder,
    getCoordinates: getCoordinates ?? defaults.getCoordinates,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Não foi possível conectar ao assistente';
}

function textEvents(text: string, channel: AssistantChannel): RealtimeClientEvent[] {
  return [
    { type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } },
    channel === 'text' ? { type: 'response.create', response: { output_modalities: ['text'] } } : { type: 'response.create' },
  ];
}

/** Executa a ferramenta e devolve o resultado ao GPT Live, se a sessão ainda for a mesma. */
async function replyToToolCall(
  event: FunctionCallArgumentsDoneEvent,
  deps: VoiceDependencies,
  channel: AssistantChannel,
  dispatch: (action: VoiceAction) => void,
  isCurrent: () => boolean,
) {
  const result = await handleToolCall(event, deps, channel === 'text' ? { modalities: ['text'] } : {});
  if (!isCurrent()) return;
  if (result.outcome) dispatch({ type: 'tool_result', callId: event.call_id, outcome: result.outcome });
  result.events.forEach((clientEvent) => deps.transport.send(clientEvent));
}

interface ConnectContext {
  deps: VoiceDependencies;
  channel: AssistantChannel;
  dispatch: (action: VoiceAction) => void;
  gen: number;
  generation: RefObject<number>;
  connection: RefObject<Promise<void> | null>;
}

/** Conecta o transporte e liga eventos -> reducer e chamadas de função -> ferramentas. */
async function connectSession({ deps, channel, dispatch, gen, generation, connection }: ConnectContext) {
  const isCurrent = () => gen === generation.current;
  const fail = (message: string) => {
    if (!isCurrent()) return;
    generation.current += 1;
    connection.current = null;
    deps.transport.disconnect();
    dispatch({ type: 'transport_error', message });
  };
  try {
    await deps.transport.connect({
      onEvent: (event) => {
        if (!isCurrent()) return;
        dispatch({ type: 'server_event', event });
        if (event.type === 'response.function_call_arguments.done') {
          void replyToToolCall(event, deps, channel, dispatch, isCurrent);
        }
      },
      onError: (error) => fail(errorMessage(error)),
      onClose: () => fail('A conexão com o assistente foi encerrada'),
    });
    if (isCurrent()) dispatch({ type: 'connected' });
  } catch (error) {
    fail(errorMessage(error));
    throw error;
  }
}

export function useAssistantSession(channel: AssistantChannel, options: AssistantSessionOptions = {}): AssistantSession {
  const [deps] = useState(() => resolveDependencies(channel, options));
  const { transport } = deps;
  const [session, dispatch] = useReducer(voiceReducer, initialVoiceState);
  // Geração da sessão: eventos de sessões antigas (após stop) são descartados.
  const generation = useRef(0);
  const connection = useRef<Promise<void> | null>(null);
  const messageCounter = useRef(0);

  const start = useCallback(async () => {
    if (!connection.current) {
      const gen = ++generation.current;
      dispatch({ type: 'start' });
      connection.current = connectSession({ deps, channel, dispatch, gen, generation, connection });
    }
    await connection.current.catch(() => undefined);
  }, [channel, deps]);

  const stop = useCallback(() => {
    generation.current += 1;
    connection.current = null;
    transport.disconnect();
    dispatch({ type: 'stop' });
  }, [transport]);

  const mute = useCallback(
    (muted?: boolean) => {
      const next = muted ?? !session.muted;
      transport.setMuted(next);
      dispatch({ type: 'set_muted', muted: next });
    },
    [session.muted, transport],
  );

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      await start();
      if (!connection.current) return; // a conexão falhou
      dispatch({ type: 'user_text', id: `local_${++messageCounter.current}`, text: trimmed });
      textEvents(trimmed, channel).forEach((event) => transport.send(event));
    },
    [channel, start, transport],
  );

  useEffect(() => () => transport.disconnect(), [transport]);

  return { session, mode: deps.mode, start, stop, mute, sendText };
}
