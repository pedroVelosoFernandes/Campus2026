import { handleSessionGrant } from '@/services/server/auth/handlers';
import { authLimits } from '@/services/server/auth/limits';
import { readServerEnv } from '@/services/server/env';

// Emite sessão de convidado (`grant: "guest"`) ou renova uma sessão (`grant: "refresh"`).
export function POST(request: Request): Promise<Response> {
  return handleSessionGrant(request, readServerEnv(), authLimits);
}
