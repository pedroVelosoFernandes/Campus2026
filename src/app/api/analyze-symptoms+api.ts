import { handleAnalyzeSymptoms } from '@/services/server/analyze-symptoms';
import { readServerEnv } from '@/services/server/env';
import { createRequestGuard, parseAllowedOrigins } from '@/services/server/request-guard';

// Rota de servidor: a chave da OpenAI só existe aqui e nunca vai para o app.
// Caminho reservado para a delegação pelo cliente (modelo de sintomas próprio).
const guard = createRequestGuard({ allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS) });

export function POST(request: Request): Promise<Response> {
  return handleAnalyzeSymptoms(request, readServerEnv(), { guard });
}
