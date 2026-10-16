import { createRequestGuard, parseAllowedOrigins, sessionSecretFromEnv } from '@/services/server/request-guard';
import { handleHealthUnits } from '@/services/health-units/server-handler';

// Rota de servidor: consulta o CNES (dados abertos do Ministério da Saúde) com
// cache, para o app não depender da API pública diretamente.
// Exige token de sessão do app (usuário gov.br ou convidado) e limita o volume
// para não sobrecarregar a API pública.
const guard = createRequestGuard({
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
  maxRequests: 30,
  requireSession: { secret: sessionSecretFromEnv },
});

export function POST(request: Request): Promise<Response> {
  return handleHealthUnits(request, { guard });
}
