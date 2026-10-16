import { readServerEnv } from '@/services/server/env';
import { handleLiveSession } from '@/services/server/live-session';
import { createRequestGuard, parseAllowedOrigins } from '@/services/server/request-guard';

// Rota de servidor: a chave da OpenAI só existe aqui e nunca vai para o app.
const guard = createRequestGuard({ allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS) });

export function POST(request: Request): Promise<Response> {
  return handleLiveSession(request, readServerEnv(), { guard });
}
