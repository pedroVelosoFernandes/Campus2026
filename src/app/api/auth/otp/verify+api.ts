import { handleOtpVerify } from '@/services/server/auth/handlers';
import { authLimits } from '@/services/server/auth/limits';
import { readServerEnv } from '@/services/server/env';

// Confere o código e emite a sessão do app (o telefone só vai para o token como HMAC).
export function POST(request: Request): Promise<Response> {
  return handleOtpVerify(request, readServerEnv(), authLimits);
}
