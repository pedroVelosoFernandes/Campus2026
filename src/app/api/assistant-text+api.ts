import { handleAssistantText } from '@/services/server/assistant-text';
import { readServerEnv } from '@/services/server/env';
import { createRequestGuard, parseAllowedOrigins } from '@/services/server/request-guard';

// Rota de servidor: a chave da OpenAI só existe aqui e nunca vai para o app.
const guard = createRequestGuard({
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
  maxRequests: 30,
});

export function POST(request: Request): Promise<Response> {
  return handleAssistantText(request, readServerEnv(), { guard });
}
