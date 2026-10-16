import { readServerEnv } from '@/services/server/env';
import { handleLiveSession } from '@/services/server/live-session';
import { createRequestGuard, parseAllowedOrigins, sessionSecretFromEnv } from '@/services/server/request-guard';

// Rota de servidor: a chave da OpenAI só existe aqui e nunca vai para o app.
// Exige token de sessão do app (usuário gov.br ou convidado).
const guard = createRequestGuard({
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
  requireSession: { secret: sessionSecretFromEnv },
});

export function POST(request: Request): Promise<Response> {
  return handleLiveSession(request, readServerEnv(), { guard });
}
