import { OFFICIAL_CHANNELS_NOTICE, parseUnitSearchInput } from '@/services/health-units/local-finder';
import type { Coordinates, HealthUnitFinder, UnitSearchResult } from '@/services/health-units/types';
import { createFallbackResult, parseSymptomInput } from '@/services/symptom-model/parse';
import type { SymptomAnalyzer, SymptomResult } from '@/services/symptom-model/types';

import { SYMPTOM_TOOL_NAME, UNITS_TOOL_NAME } from './tools';
import type { FunctionCallArgumentsDoneEvent, OutputModality, RealtimeClientEvent, ToolResult } from './types';

/**
 * Trata uma chamada de função do GPT Live: executa a ferramenta e devolve os
 * eventos a enviar de volta (`function_call_output` + `response.create`).
 * Nunca lança: em qualquer falha devolve um resultado seguro.
 * Docs: https://developers.openai.com/api/docs/guides/realtime-conversations
 */

export interface ToolDependencies {
  analyzer: SymptomAnalyzer;
  unitFinder: HealthUnitFinder;
  /** Localização do aparelho, se a pessoa permitiu. */
  getCoordinates?: () => Promise<Coordinates | null>;
}

export interface ToolCallOptions {
  signal?: AbortSignal;
  /** Modalidade da resposta seguinte (texto no modo chat). Omitido = padrão da sessão. */
  modalities?: OutputModality[];
}

export interface ToolCallOutcome {
  events: RealtimeClientEvent[];
  /** Resultado validado; `null` quando a função chamada é desconhecida. */
  outcome: ToolResult | null;
}

function outputEvents(callId: string, output: unknown, modalities?: OutputModality[]): RealtimeClientEvent[] {
  return [
    {
      type: 'conversation.item.create',
      item: { type: 'function_call_output', call_id: callId, output: JSON.stringify(output) },
    },
    modalities ? { type: 'response.create', response: { output_modalities: modalities } } : { type: 'response.create' },
  ];
}

function parseArguments(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function runSymptoms(args: unknown, deps: ToolDependencies, signal?: AbortSignal): Promise<SymptomResult> {
  const input = parseSymptomInput(args);
  if (!input.ok) return createFallbackResult();
  try {
    return await deps.analyzer.analyze(input.value, signal ? { signal } : {});
  } catch {
    return createFallbackResult();
  }
}

export function unitSearchFallback(servico: UnitSearchResult['servico'] = 'ubs'): UnitSearchResult {
  return {
    servico,
    units: [],
    usedLocation: false,
    notice: `Não consegui buscar as unidades agora. ${OFFICIAL_CHANNELS_NOTICE}`,
  };
}

async function runUnits(args: unknown, deps: ToolDependencies): Promise<UnitSearchResult> {
  const input = parseUnitSearchInput(args);
  if (!input.ok) return unitSearchFallback();
  try {
    const coordinates = (await deps.getCoordinates?.().catch(() => null)) ?? null;
    return await deps.unitFinder.find({ ...input.value, coordinates });
  } catch {
    return unitSearchFallback(input.value.servico);
  }
}

export async function handleToolCall(
  event: FunctionCallArgumentsDoneEvent,
  deps: ToolDependencies,
  options: ToolCallOptions = {},
): Promise<ToolCallOutcome> {
  const args = parseArguments(event.arguments);
  let outcome: ToolResult;
  if (event.name === SYMPTOM_TOOL_NAME) {
    outcome = { tool: SYMPTOM_TOOL_NAME, result: await runSymptoms(args, deps, options.signal) };
  } else if (event.name === UNITS_TOOL_NAME) {
    outcome = { tool: UNITS_TOOL_NAME, result: await runUnits(args, deps) };
  } else {
    const error = { error: `Função desconhecida: ${event.name}` };
    return { events: outputEvents(event.call_id, error, options.modalities), outcome: null };
  }
  return { events: outputEvents(event.call_id, outcome.result, options.modalities), outcome };
}
