import { handleAssistantText } from '@/services/server/assistant-text';
import { readServerEnv } from '@/services/server/env';
import { createRequestGuard, parseAllowedOrigins, sessionSecretFromEnv } from '@/services/server/request-guard';

// Rota de servidor: a chave da OpenAI só existe aqui e nunca vai para o app.
// Exige token de sessão do app (usuário gov.br ou convidado).
const guard = createRequestGuard({
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
  maxRequests: 30,
  requireSession: { secret: sessionSecretFromEnv },
});

export function POST(request: Request): Promise<Response> {
  return handleAssistantText(request, readServerEnv(), { guard });
}
