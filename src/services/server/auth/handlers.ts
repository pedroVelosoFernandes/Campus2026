import { isOtpCode, maskE164, normalizeBrMobile } from '@/features/auth/phone';
import type { FetchLike } from '@/services/symptom-model/types';

import type { ServerEnv } from '../env';
import { clientIp, createRateLimiter, tooManyRequests, unauthorized } from '../request-guard';
import { resolveOtpProvider, type OtpProvider } from './otp-provider';
import { isUsableSecret, issueSession, pseudonymize, randomGuestId, verifySessionToken } from './token';

/**
 * Handlers das rotas de autenticação:
 * - `POST /api/auth/otp/start`  `{ phone }`        → envia o código por SMS;
 * - `POST /api/auth/otp/verify` `{ phone, code }`  → confere e emite a sessão do app;
 * - `POST /api/auth/session` `{ grant: "guest" }` ou `{ grant: "refresh", refreshToken }`.
 * O telefone nunca vai para o token: o sujeito é um HMAC do número (LGPD).
 */

export interface AuthUserPayload {
  id: string;
  /** Telefone mascarado para exibição, ex.: `(11) •••••-4321`. */
  phoneMasked: string;
}

export interface AuthHandlerDeps {
  fetchImpl?: FetchLike;
  now?: () => number;
  /** Substitui o fornecedor de SMS (testes). */
  provider?: OtpProvider | null;
}

/** Intervalo mínimo entre dois envios para o mesmo número. */
export const RESEND_AFTER_SECONDS = 30;
const TEN_MINUTES = 10 * 60_000;
const NO_STORE = { 'Cache-Control': 'no-store' } as const;

const secretError = () =>
  Response.json({ error: 'APP_SESSION_SECRET não configurada no servidor' }, { status: 500 });

/** Limites em memória, por processo (ver docs/autenticacao.md para produção). */
export function createAuthLimits(now?: () => number) {
  const perMinute = createRateLimiter(60_000, now);
  const per30s = createRateLimiter(RESEND_AFTER_SECONDS * 1000, now);
  const per10min = createRateLimiter(TEN_MINUTES, now);
  const perHour = createRateLimiter(60 * 60_000, now);
  return {
    /** Envio: 1 a cada 30 s e 3 por 10 min por número; 10 por hora por IP. */
    start: (ip: string, phoneKey: string) =>
      per30s(`start-gap:${phoneKey}`, 1) || per10min(`start:${phoneKey}`, 3) || perHour(`start-ip:${ip}`, 10),
    /** Tentativas de código: 5 por 10 min por número; 20 por 10 min por IP. */
    verify: (ip: string, phoneKey: string) =>
      per10min(`verify:${phoneKey}`, 5) || per10min(`verify-ip:${ip}`, 20),
    refresh: (ip: string) => perMinute(`refresh:${ip}`, 30),
    guest: (ip: string) => perHour(`guest:${ip}`, 20),
  };
}

export type AuthLimits = ReturnType<typeof createAuthLimits>;

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function providerFor(env: ServerEnv, deps: AuthHandlerDeps): OtpProvider | null {
  if (deps.provider !== undefined) return deps.provider;
  return resolveOtpProvider(env, deps.fetchImpl ?? ((url, init) => fetch(url, init)));
}

const notConfigured = () =>
  Response.json({ error: 'Login por SMS não configurado no servidor' }, { status: 501 });
const invalidPhone = () =>
  Response.json({ error: 'Informe um celular válido com DDD.' }, { status: 400 });

export async function handleOtpStart(
  request: Request,
  env: ServerEnv,
  limits: AuthLimits,
  deps: AuthHandlerDeps = {},
): Promise<Response> {
  const secret = env.APP_SESSION_SECRET;
  if (!isUsableSecret(secret)) return secretError();
  const provider = providerFor(env, deps);
  if (!provider) return notConfigured();
  const body = await readJson(request);
  const phone = typeof body?.phone === 'string' ? normalizeBrMobile(body.phone) : null;
  if (!phone) return invalidPhone();
  if (limits.start(clientIp(request), await pseudonymize(phone, secret))) return tooManyRequests();

  const result = await provider.start(phone);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(
    { sent: true, retryAfterSeconds: RESEND_AFTER_SECONDS, ...(provider.name === 'dev' ? { dev: true } : {}) },
    { headers: NO_STORE },
  );
}

export async function handleOtpVerify(
  request: Request,
  env: ServerEnv,
  limits: AuthLimits,
  deps: AuthHandlerDeps = {},
): Promise<Response> {
  const secret = env.APP_SESSION_SECRET;
  if (!isUsableSecret(secret)) return secretError();
  const provider = providerFor(env, deps);
  if (!provider) return notConfigured();
  const body = await readJson(request);
  const phone = typeof body?.phone === 'string' ? normalizeBrMobile(body.phone) : null;
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!phone) return invalidPhone();
  if (!isOtpCode(code)) return Response.json({ error: 'O código tem 6 números.' }, { status: 400 });
  const phoneKey = await pseudonymize(phone, secret);
  if (limits.verify(clientIp(request), phoneKey)) {
    return Response.json({ error: 'Muitas tentativas. Peça um novo código em alguns minutos.' }, { status: 429 });
  }

  const outcome = await provider.check(phone, code);
  if (outcome === 'error') return Response.json({ error: 'Não foi possível conferir o código agora.' }, { status: 502 });
  if (outcome === 'expired') return unauthorized('Código expirado. Peça um novo.');
  if (outcome !== 'approved') return unauthorized('Código incorreto.');

  const id = `phone_${phoneKey}`;
  const nowSeconds = Math.floor((deps.now?.() ?? Date.now()) / 1000);
  const session = await issueSession(id, 'user', secret, nowSeconds);
  const user: AuthUserPayload = { id, phoneMasked: maskE164(phone) };
  return Response.json({ session, user }, { headers: NO_STORE });
}

export async function handleSessionGrant(
  request: Request,
  env: ServerEnv,
  limits: AuthLimits,
  deps: AuthHandlerDeps = {},
): Promise<Response> {
  const secret = env.APP_SESSION_SECRET;
  if (!isUsableSecret(secret)) return secretError();
  const body = await readJson(request);
  const ip = clientIp(request);
  const nowSeconds = Math.floor((deps.now?.() ?? Date.now()) / 1000);

  if (body?.grant === 'guest') {
    if (limits.guest(ip)) return tooManyRequests();
    const session = await issueSession(randomGuestId(), 'guest', secret, nowSeconds);
    return Response.json({ session }, { headers: NO_STORE });
  }
  if (body?.grant === 'refresh' && typeof body.refreshToken === 'string') {
    if (limits.refresh(ip)) return tooManyRequests();
    const verified = await verifySessionToken(body.refreshToken, secret, { use: 'refresh', nowSeconds });
    if (!verified.ok) return unauthorized('Sessão expirada. Entre de novo.');
    const session = await issueSession(verified.claims.sub, verified.claims.kind, secret, nowSeconds);
    return Response.json({ session }, { headers: NO_STORE });
  }
  return Response.json({ error: 'grant deve ser "guest" ou "refresh"' }, { status: 400 });
}
