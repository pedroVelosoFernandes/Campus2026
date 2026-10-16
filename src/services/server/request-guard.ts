/**
 * Proteção mínima das rotas que gastam a chave da OpenAI. O guia do GPT-Live
 * avisa que checar a origem NÃO autentica ninguém.
 *
 * TODO(auth): antes de expor publicamente, exigir autenticação do usuário
 * (ex.: token de sessão do app), autorização, limites por usuário em um
 * armazenamento compartilhado (Redis etc.) e HTTPS. O limite abaixo é em
 * memória, por processo, e serve só como placeholder.
 */

export interface RequestGuardOptions {
  /** Origens web aceitas. Apps nativos não enviam `Origin` e passam. Vazio = qualquer origem. */
  allowedOrigins?: string[];
  maxRequests?: number;
  windowMs?: number;
  now?: () => number;
}

export type RequestGuard = (request: Request) => Response | null;

export function parseAllowedOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'anonimo';
}

/** Devolve uma `Response` de erro quando a requisição deve ser barrada, ou `null`. */
export function createRequestGuard(options: RequestGuardOptions = {}): RequestGuard {
  const maxRequests = options.maxRequests ?? 10;
  const windowMs = options.windowMs ?? 60_000;
  const now = options.now ?? Date.now;
  const hits = new Map<string, number[]>();

  return (request) => {
    const origin = request.headers.get('origin');
    const allowed = options.allowedOrigins ?? [];
    if (origin && allowed.length > 0 && !allowed.includes(origin)) {
      return Response.json({ error: 'Origem não permitida' }, { status: 403 });
    }
    const key = clientKey(request);
    const current = now();
    const recent = (hits.get(key) ?? []).filter((time) => current - time < windowMs);
    if (recent.length >= maxRequests) {
      return Response.json({ error: 'Muitas requisições. Tente de novo em instantes.' }, { status: 429 });
    }
    recent.push(current);
    hits.set(key, recent);
    return null;
  };
}
