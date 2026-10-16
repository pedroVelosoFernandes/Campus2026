import { buildRealtimeSessionConfig } from '@/features/voice/session-config';
import type { FetchLike } from '@/services/symptom-model/types';

/**
 * Handler da rota `POST /api/realtime-session`. Gera um client secret efêmero
 * do Realtime para o app abrir a conexão WebRTC sem nunca ver a chave real.
 * Docs: https://developers.openai.com/api/docs/guides/realtime-webrtc
 */

export const OPENAI_CLIENT_SECRETS_URL = 'https://api.openai.com/v1/realtime/client_secrets';
export const CLIENT_SECRET_TTL_SECONDS = 600;

export interface ServerEnv {
  OPENAI_API_KEY?: string;
  OPENAI_REALTIME_MODEL?: string;
  SYMPTOM_MODEL?: string;
}

export interface RealtimeSessionResponse {
  clientSecret: string;
  expiresAt: number | null;
  model: string;
}

export async function handleRealtimeSession(
  env: ServerEnv,
  fetchImpl: FetchLike = (url, init) => fetch(url, init),
): Promise<Response> {
  if (!env.OPENAI_API_KEY) {
    return Response.json({ error: 'OPENAI_API_KEY não configurada no servidor' }, { status: 500 });
  }
  const session = buildRealtimeSessionConfig({ model: env.OPENAI_REALTIME_MODEL });
  let upstream: Response;
  try {
    upstream = await fetchImpl(OPENAI_CLIENT_SECRETS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_after: { anchor: 'created_at', seconds: CLIENT_SECRET_TTL_SECONDS },
        session,
      }),
    });
  } catch {
    return Response.json({ error: 'Falha ao contatar a OpenAI' }, { status: 502 });
  }
  if (!upstream.ok) {
    return Response.json({ error: `OpenAI respondeu ${upstream.status}` }, { status: 502 });
  }
  const data = (await upstream.json()) as { value?: unknown; expires_at?: unknown };
  if (typeof data.value !== 'string' || !data.value) {
    return Response.json({ error: 'Resposta da OpenAI sem client secret' }, { status: 502 });
  }
  const body: RealtimeSessionResponse = {
    clientSecret: data.value,
    expiresAt: typeof data.expires_at === 'number' ? data.expires_at : null,
    model: session.model,
  };
  return Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
