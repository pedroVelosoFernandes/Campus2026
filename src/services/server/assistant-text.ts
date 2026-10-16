import { APP_TOOLS } from '@/features/voice/tools';
import { DEFAULT_DELEGATION_MODEL, TEXT_MODE_INSTRUCTIONS } from '@/features/voice/session-config';
import { OPENAI_RESPONSES_URL } from '@/services/symptom-model/gpt-sol-analyzer';
import type { FetchLike } from '@/services/symptom-model/types';
import { extractTextTurn, parseTextTurnRequest } from '@/services/text-assistant/protocol';

import { missingKeyResponse, type ServerEnv } from './env';
import type { RequestGuard } from './request-guard';

/**
 * Handler de `POST /api/assistant-text` (modo chat). Roda um turno do mesmo
 * modelo de delegação (GPT-Sol) com as mesmas instruções e ferramentas do
 * GPT-Live. As ferramentas continuam sendo executadas no app.
 */
export async function handleAssistantText(
  request: Request,
  env: ServerEnv,
  deps: { fetchImpl?: FetchLike; guard?: RequestGuard } = {},
): Promise<Response> {
  const blocked = await deps.guard?.(request);
  if (blocked) return blocked;
  if (!env.OPENAI_API_KEY) return missingKeyResponse();
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const turn = parseTextTurnRequest(raw);
  if (!turn) return Response.json({ error: 'Conversa inválida' }, { status: 400 });

  const doFetch: FetchLike = deps.fetchImpl ?? ((url, init) => fetch(url, init));
  let upstream: Response;
  try {
    upstream = await doFetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.SYMPTOM_MODEL || DEFAULT_DELEGATION_MODEL,
        instructions: TEXT_MODE_INSTRUCTIONS,
        input: turn.input,
        tools: APP_TOOLS,
        tool_choice: 'auto',
        store: false,
      }),
      signal: request.signal,
    });
  } catch {
    return Response.json({ error: 'Falha ao contatar a OpenAI' }, { status: 502 });
  }
  if (!upstream.ok) return Response.json({ error: `OpenAI respondeu ${upstream.status}` }, { status: 502 });
  return Response.json(extractTextTurn(await upstream.json()), { headers: { 'Cache-Control': 'no-store' } });
}
