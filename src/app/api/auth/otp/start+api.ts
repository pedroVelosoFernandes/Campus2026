import { handleOtpStart } from '@/services/server/auth/handlers';
import { authLimits } from '@/services/server/auth/limits';
import { readServerEnv } from '@/services/server/env';

// Envia o código de 6 dígitos por SMS (Twilio Verify; código fixo só em desenvolvimento).
export function POST(request: Request): Promise<Response> {
  return handleOtpStart(request, readServerEnv(), authLimits);
}
