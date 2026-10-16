import {
  createGptSolAnalyzer,
  parseSymptomInput,
  type FetchLike,
  type SymptomAnalyzer,
} from '@/services/symptom-model';

import type { ServerEnv } from './realtime-session';

/**
 * Handler da rota `POST /api/analyze-symptoms`. Valida a entrada, chama o
 * modelo de sintomas (hoje o GPT-Sol) e devolve um `SymptomResult` validado.
 */

export interface AnalyzeSymptomsDeps {
  fetchImpl?: FetchLike;
  /** Permite injetar outro modelo (ex.: o modelo especializado, quando existir). */
  createAnalyzer?: (env: Required<Pick<ServerEnv, 'OPENAI_API_KEY'>> & ServerEnv) => SymptomAnalyzer;
}

export async function handleAnalyzeSymptoms(
  request: Request,
  env: ServerEnv,
  deps: AnalyzeSymptomsDeps = {},
): Promise<Response> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'OPENAI_API_KEY não configurada no servidor' }, { status: 500 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const input = parseSymptomInput(body);
  if (!input.ok) return Response.json({ error: input.error }, { status: 400 });

  const analyzer =
    deps.createAnalyzer?.({ ...env, OPENAI_API_KEY: apiKey }) ??
    createGptSolAnalyzer({ apiKey, model: env.SYMPTOM_MODEL, fetchImpl: deps.fetchImpl });
  try {
    const result = await analyzer.analyze(input.value, { signal: request.signal });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Modelo de sintomas indisponível' }, { status: 502 });
  }
}
