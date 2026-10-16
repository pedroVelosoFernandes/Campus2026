import { useCallback, useEffect, useReducer, useRef, useState, type RefObject } from 'react';

import { createVoiceDependencies, type AssistantChannel, type VoiceDependencies, type VoiceMode } from './config';
import { createEventIdFactory, createToolBatcher, readDelegationEvent, type ToolBatcher } from './delegation';
import { initialVoiceState, voiceReducer, type VoiceAction, type VoiceState } from './reducer';
import { executeToolCall, type ToolDependencies } from './tool-call';
import type { FunctionCallItem, LiveServerEvent, VoiceTransport } from './types';

/**
 * Núcleo compartilhado por `useVoiceAssistant` e `useTextAssistant`: mesma
 * máquina de estados, mesma transcrição e mesmas ferramentas. Só muda o canal.
 */

/** Silêncio após o último delta de transcrição que encerra o turno (o GPT-Live não sinaliza). */
export const TURN_QUIET_MS = 1200;

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
  const { transport, unitFinder, getCoordinates } = options;
  if (transport && unitFinder) return { mode: 'live', transport, unitFinder, getCoordinates };
  const defaults = createVoiceDependencies(channel);
  return {
    mode: transport ? 'live' : defaults.mode,
    transport: transport ?? defaults.transport,
    unitFinder: unitFinder ?? defaults.unitFinder,
    getCoordinates: getCoordinates ?? defaults.getCoordinates,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Não foi possível conectar ao assistente';
}

interface SessionRuntime {
  dispose: () => void;
}

interface ConnectContext {
  deps: VoiceDependencies;
  channel: AssistantChannel;
  dispatch: (action: VoiceAction) => void;
  gen: number;
  generation: RefObject<number>;
  connection: RefObject<Promise<void> | null>;
  runtime: RefObject<SessionRuntime | null>;
}

/** Executa a ferramenta pedida pelo backend e devolve o resultado pelo batcher. */
function runTool(call: FunctionCallItem, ctx: ConnectContext, batcher: ToolBatcher, isCurrent: () => boolean) {
  batcher.callStarted(call.call_id);
  void executeToolCall(call, ctx.deps).then(({ output, outcome }) => {
    if (!isCurrent()) return;
    if (outcome) ctx.dispatch({ type: 'tool_result', callId: call.call_id, outcome });
    batcher.submit(call.call_id, output);
  });
}

/** Liga eventos -> reducer, delegação -> ferramentas e silêncio -> fim de turno. */
function createEventHandler(ctx: ConnectContext, isCurrent: () => boolean) {
  const batcher = createToolBatcher((event) => ctx.deps.transport.send(event), createEventIdFactory());
  let quietTimer: ReturnType<typeof setTimeout> | null = null;
  const clearQuiet = () => quietTimer !== null && clearTimeout(quietTimer);
  ctx.runtime.current = { dispose: () => (clearQuiet(), batcher.reset()) };

  return (event: LiveServerEvent) => {
    if (!isCurrent()) return;
    ctx.dispatch({ type: 'server_event', event });
    if (ctx.channel === 'voice' && event.type.endsWith('_transcript.delta')) {
      clearQuiet();
      quietTimer = setTimeout(() => {
        if (isCurrent()) ctx.dispatch({ type: 'server_event', event: { type: 'app.turn_completed' } });
      }, TURN_QUIET_MS);
    }
    const signal = readDelegationEvent(event);
    if (signal?.kind === 'response_started') batcher.responseStarted();
    else if (signal?.kind === 'response_finished') batcher.responseFinished();
    else if (signal?.kind === 'function_call') runTool(signal.call, ctx, batcher, isCurrent);
  };
}

async function connectSession(ctx: ConnectContext) {
  const isCurrent = () => ctx.gen === ctx.generation.current;
  const fail = (message: string) => {
    if (!isCurrent()) return;
    ctx.generation.current += 1;
    ctx.connection.current = null;
    ctx.runtime.current?.dispose();
    void ctx.deps.transport.disconnect();
    ctx.dispatch({ type: 'transport_error', message });
  };
  try {
    await ctx.deps.transport.connect({
      onEvent: createEventHandler(ctx, isCurrent),
      onError: (error) => fail(errorMessage(error)),
      onClose: () => fail('A conexão com o assistente foi encerrada'),
    });
    if (isCurrent()) ctx.dispatch({ type: 'connected' });
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
  const runtime = useRef<SessionRuntime | null>(null);
  const [nextEventId] = useState(() => createEventIdFactory('evt_user'));

  const start = useCallback(async () => {
    if (!connection.current) {
      const gen = ++generation.current;
      dispatch({ type: 'start' });
      connection.current = connectSession({ deps, channel, dispatch, gen, generation, connection, runtime });
    }
    await connection.current.catch(() => undefined);
  }, [channel, deps]);

  const stop = useCallback(() => {
    generation.current += 1;
    connection.current = null;
    runtime.current?.dispose();
    void transport.disconnect();
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
      dispatch({ type: 'user_text', text: trimmed });
      transport.send({ type: 'app.user_text', event_id: nextEventId(), text: trimmed });
    },
    [nextEventId, start, transport],
  );

  useEffect(
    () => () => {
      runtime.current?.dispose();
      void transport.disconnect();
    },
    [transport],
  );

  return { session, mode: deps.mode, start, stop, mute, sendText };
}
