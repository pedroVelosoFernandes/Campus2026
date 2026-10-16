import { parseSymptomResult } from './parse';
import {
  buildSymptomPrompt,
  SYMPTOM_RESULT_SCHEMA,
  SYMPTOM_RESULT_SCHEMA_NAME,
  SYMPTOM_SYSTEM_PROMPT,
} from './prompt';
import type { FetchLike, SymptomAnalyzer, SymptomInput, SymptomResult } from './types';

/**
 * Cliente do GPT-Sol, substituto TEMPORÁRIO do modelo especializado de sintomas.
 * Roda apenas no servidor (rota `/api/analyze-symptoms`): recebe a chave por
 * parâmetro e nunca a lê do ambiente do app.
 */

export const DEFAULT_SYMPTOM_MODEL = 'gpt-sol';
export const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

export interface GptSolAnalyzerOptions {
  apiKey: string;
  model?: string;
  fetchImpl?: FetchLike;
  url?: string;
}

export class SymptomModelError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'SymptomModelError';
  }
}

interface ResponsesOutputContent {
  type?: string;
  text?: string;
  refusal?: string;
}

interface ResponsesPayload {
  status?: string;
  output?: { type?: string; content?: ResponsesOutputContent[] }[];
}

/** Extrai o texto JSON (`output_text`) do retorno bruto da Responses API. */
export function extractOutputText(payload: ResponsesPayload): string | null {
  if (payload.status && payload.status !== 'completed') return null;
  for (const item of payload.output ?? []) {
    if (item.type !== 'message') continue;
    for (const part of item.content ?? []) {
      if (part.type === 'refusal') return null;
      if (part.type === 'output_text' && typeof part.text === 'string') return part.text;
    }
  }
  return null;
}

export function buildResponsesRequestBody(model: string, input: SymptomInput) {
  return {
    model,
    instructions: SYMPTOM_SYSTEM_PROMPT,
    input: [{ role: 'user', content: buildSymptomPrompt(input) }],
    text: {
      format: {
        type: 'json_schema',
        name: SYMPTOM_RESULT_SCHEMA_NAME,
        schema: SYMPTOM_RESULT_SCHEMA,
        strict: true,
      },
    },
    store: false,
  };
}

export function createGptSolAnalyzer(options: GptSolAnalyzerOptions): SymptomAnalyzer {
  const model = options.model || DEFAULT_SYMPTOM_MODEL;
  const doFetch: FetchLike = options.fetchImpl ?? ((url, init) => fetch(url, init));
  const url = options.url ?? OPENAI_RESPONSES_URL;

  return {
    async analyze(input, { signal } = {}): Promise<SymptomResult> {
      const response = await doFetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildResponsesRequestBody(model, input)),
        signal,
      });
      if (!response.ok) {
        throw new SymptomModelError(`Modelo de sintomas respondeu ${response.status}`, response.status);
      }
      const payload = (await response.json()) as ResponsesPayload;
      const text = extractOutputText(payload);
      return parseSymptomResult(text);
    },
  };
}
