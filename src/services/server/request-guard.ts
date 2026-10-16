import { bearerToken, isUsableSecret, verifySessionToken, type SessionClaims } from './auth/token';

/**
 * Proteção das rotas que gastam a chave da OpenAI:
 * 1. origem web (opcional — NÃO autentica ninguém, só filtra navegadores);
 * 2. token de sessão do app (`Authorization: Bearer`), emitido por
 *    `/api/auth/session` (convidado) ou `/api/auth/govbr` (usuário gov.br);
 * 3. limite de requisições por sujeito; convidados têm limite menor e são
 *    contados por IP, para que gerar tokens novos não fure o limite.
 *
 * O limite é em memória, por processo. Em produção com várias instâncias,
 * troque `hits` por um armazenamento compartilhado (Redis etc.). Ver
 * docs/autenticacao.md.
 */

export interface RequestGuardOptions {
  /** Origens web aceitas. Apps nativos não enviam `Origin` e passam. Vazio = qualquer origem. */
  allowedOrigins?: string[];
  /** Limite por janela para usuários autenticados (ou por IP, sem sessão exigida). */
  maxRequests?: number;
  /** Limite por janela para convidados (padrão: metade de `maxRequests`). */
  guestMaxRequests?: number;
  windowMs?: number;
  now?: () => number;
  /** Exige token de sessão válido. O segredo é lido a cada requisição. */
  requireSession?: { secret: () => string | undefined };
}

export type GuardResult = Response | null;
export type RequestGuard = (request: Request) => GuardResult | Promise<GuardResult>;

export function parseAllowedOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'anonimo';
}

export function unauthorized(message = 'Sessão inválida ou expirada'): Response {
  return Response.json(
    { error: message },
    { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="alo-saude"' } },
  );
}

/** Janela deslizante simples em memória. Devolve `true` quando a chave estourou o limite. */
export function createRateLimiter(windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  return (key: string, max: number): boolean => {
    const current = now();
    const recent = (hits.get(key) ?? []).filter((time) => current - time < windowMs);
    if (recent.length >= max) {
      hits.set(key, recent);
      return true;
    }
    recent.push(current);
    hits.set(key, recent);
    return false;
  };
}

export function tooManyRequests(): Response {
  return Response.json({ error: 'Muitas requisições. Tente de novo em instantes.' }, { status: 429 });
}

async function authenticate(
  request: Request,
  secret: string | undefined,
): Promise<{ claims: SessionClaims } | { error: Response }> {
  if (!isUsableSecret(secret)) {
    return { error: Response.json({ error: 'APP_SESSION_SECRET não configurada no servidor' }, { status: 500 }) };
  }
  const token = bearerToken(request);
  if (!token) return { error: unauthorized('Faça login ou continue como convidado') };
  const result = await verifySessionToken(token, secret);
  return result.ok ? { claims: result.claims } : { error: unauthorized() };
}

/** Devolve uma `Response` de erro quando a requisição deve ser barrada, ou `null`. */
export function createRequestGuard(options: RequestGuardOptions = {}): RequestGuard {
  const maxRequests = options.maxRequests ?? 10;
  const guestMax = options.guestMaxRequests ?? Math.max(1, Math.ceil(maxRequests / 2));
  const limited = createRateLimiter(options.windowMs ?? 60_000, options.now);

  function checkOrigin(request: Request): Response | null {
    const origin = request.headers.get('origin');
    const allowed = options.allowedOrigins ?? [];
    if (origin && allowed.length > 0 && !allowed.includes(origin)) {
      return Response.json({ error: 'Origem não permitida' }, { status: 403 });
    }
    return null;
  }

  return async (request) => {
    const blocked = checkOrigin(request);
    if (blocked) return blocked;
    if (!options.requireSession) {
      return limited(`ip:${clientIp(request)}`, maxRequests) ? tooManyRequests() : null;
    }
    const auth = await authenticate(request, options.requireSession.secret());
    if ('error' in auth) return auth.error;
    const { claims } = auth;
    const over =
      claims.kind === 'user'
        ? limited(`user:${claims.sub}`, maxRequests)
        : limited(`guest-ip:${clientIp(request)}`, guestMax);
    return over ? tooManyRequests() : null;
  };
}

/** Lê o segredo de sessão do ambiente no momento da requisição. */
export const sessionSecretFromEnv = () => process.env.APP_SESSION_SECRET;
