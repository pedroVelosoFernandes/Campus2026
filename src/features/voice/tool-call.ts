import { OFFICIAL_CHANNELS_NOTICE, parseUnitSearchInput } from '@/services/health-units/local-finder';
import type { Coordinates, HealthUnitFinder, UnitSearchResult } from '@/services/health-units/types';
import { parseSymptomResult } from '@/services/symptom-model/parse';

import { SYMPTOM_TOOL_NAME, UNITS_TOOL_NAME } from './tools';
import type { FunctionCallItem, ToolResult } from './types';

/**
 * Executa uma ferramenta pedida pelo backend de delegação e devolve o texto do
 * `function_call_output`. Nunca lança: em qualquer falha devolve um resultado
 * seguro (procure atendimento / confirme pelos canais oficiais).
 */

export interface ToolDependencies {
  unitFinder: HealthUnitFinder;
  /** Localização do aparelho, se a pessoa permitiu. */
  getCoordinates?: () => Promise<Coordinates | null>;
}

export interface ToolExecution {
  /** JSON enviado de volta como `function_call_output.output`. */
  output: string;
  /** Resultado validado; `null` quando a função chamada é desconhecida. */
  outcome: ToolResult | null;
}

function parseArguments(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
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

export async function executeToolCall(
  call: Pick<FunctionCallItem, 'name' | 'arguments'>,
  deps: ToolDependencies,
): Promise<ToolExecution> {
  const args = parseArguments(call.arguments);
  let outcome: ToolResult;
  if (call.name === SYMPTOM_TOOL_NAME) {
    // A avaliação vem do modelo de sintomas; o app valida e aplica as regras de segurança.
    outcome = { tool: SYMPTOM_TOOL_NAME, result: parseSymptomResult(args) };
  } else if (call.name === UNITS_TOOL_NAME) {
    outcome = { tool: UNITS_TOOL_NAME, result: await runUnits(args, deps) };
  } else {
    return { output: JSON.stringify({ error: `Função desconhecida: ${call.name}` }), outcome: null };
  }
  return { output: JSON.stringify(outcome.result), outcome };
}
