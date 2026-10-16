import { buildLiveSessionConfig } from '@/features/voice/session-config';
import type { FetchLike } from '@/services/symptom-model/types';

import { missingKeyResponse, type ServerEnv } from './env';
import type { RequestGuard } from './request-guard';

/**
 * Handler de `POST /api/live-session`. O app envia sua oferta SDP; o servidor
 * cria a sessão GPT-Live com a chave do projeto (que nunca sai daqui) e
 * devolve a resposta SDP. Não há client secret efêmero nesse fluxo.
 * Docs: https://developers.openai.com/api/docs/guides/realtime-webrtc (seção GPT-Live)
 */

export const OPENAI_LIVE_SESSIONS_URL = 'https://api.openai.com/v1/live/sessions';
export const MAX_SDP_BYTES = 64 * 1024;

export interface LiveSessionResponse {
  sessionId: string;
  sdp: string;
}

async function readOffer(request: Request): Promise<string | null> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/sdp')) return null;
  const sdp = await request.text();
  if (!sdp.startsWith('v=') || sdp.length > MAX_SDP_BYTES) return null;
  return sdp;
}

export async function handleLiveSession(
  request: Request,
  env: ServerEnv,
  deps: { fetchImpl?: FetchLike; guard?: RequestGuard } = {},
): Promise<Response> {
  const blocked = deps.guard?.(request);
  if (blocked) return blocked;
  if (!env.OPENAI_API_KEY) return missingKeyResponse();
  const sdp = await readOffer(request);
  if (!sdp) return Response.json({ error: 'Envie uma oferta SDP (application/sdp)' }, { status: 400 });

  const session = buildLiveSessionConfig({ model: env.OPENAI_LIVE_MODEL, delegationModel: env.SYMPTOM_MODEL });
  const doFetch: FetchLike = deps.fetchImpl ?? ((url, init) => fetch(url, init));
  let upstream: Response;
  try {
    upstream = await doFetch(OPENAI_LIVE_SESSIONS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ session, transport: { type: 'webrtc', sdp } }),
    });
  } catch {
    return Response.json({ error: 'Falha ao contatar a OpenAI' }, { status: 502 });
  }
  if (!upstream.ok) return Response.json({ error: `OpenAI respondeu ${upstream.status}` }, { status: 502 });
  const data = (await upstream.json()) as { session?: { id?: unknown }; transport?: { sdp?: unknown } };
  const sessionId = data.session?.id;
  const answer = data.transport?.sdp;
  if (typeof sessionId !== 'string' || typeof answer !== 'string') {
    return Response.json({ error: 'Resposta inesperada da OpenAI' }, { status: 502 });
  }
  const body: LiveSessionResponse = { sessionId, sdp: answer };
  return Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
