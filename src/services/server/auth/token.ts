/**
 * Token de sessão do Alô Saúde: JWT compacto assinado com HMAC-SHA256 via
 * Web Crypto (disponível no runtime de servidor do Expo e no Node 18+).
 * O segredo vem de `APP_SESSION_SECRET` e nunca sai do servidor.
 */

export type SessionKind = 'user' | 'guest';
export type TokenUse = 'access' | 'refresh';

export interface SessionClaims {
  /** Identificador pseudônimo (nunca o CPF em claro). */
  sub: string;
  kind: SessionKind;
  use: TokenUse;
  /** Emitido em (segundos desde a época). */
  iat: number;
  /** Expira em (segundos desde a época). */
  exp: number;
}

export type VerifyResult =
  | { ok: true; claims: SessionClaims }
  | { ok: false; reason: 'malformed' | 'signature' | 'expired' | 'wrong-use' };

/** Vida curta do token de acesso; o app renova antes de expirar. */
export const ACCESS_TTL_SECONDS = 15 * 60;
/** Renovação de usuário autenticado (o app pede novo acesso com ela). */
export const USER_REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;
/** Convidados renovam por menos tempo. */
export const GUEST_REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;
/** Segredos curtos demais são recusados (HS256 pede ≥ 256 bits). */
export const MIN_SECRET_LENGTH = 32;

const encoder = new TextEncoder();
const HEADER = { alg: 'HS256', typ: 'JWT' } as const;

function base64UrlFromBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bytesFromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const encodeJson = (value: unknown) => base64UrlFromBytes(encoder.encode(JSON.stringify(value)));

function importKey(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

export function isUsableSecret(secret: string | undefined): secret is string {
  return typeof secret === 'string' && secret.length >= MIN_SECRET_LENGTH;
}

export async function signSessionToken(claims: SessionClaims, secret: string): Promise<string> {
  const unsigned = `${encodeJson(HEADER)}.${encodeJson(claims)}`;
  const key = await importKey(secret, 'sign');
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(unsigned)));
  return `${unsigned}.${base64UrlFromBytes(signature)}`;
}

function parseClaims(segment: string): SessionClaims | null {
  try {
    const value = JSON.parse(new TextDecoder().decode(bytesFromBase64Url(segment))) as Partial<SessionClaims>;
    const valid =
      typeof value.sub === 'string' &&
      (value.kind === 'user' || value.kind === 'guest') &&
      (value.use === 'access' || value.use === 'refresh') &&
      typeof value.iat === 'number' &&
      typeof value.exp === 'number';
    return valid ? (value as SessionClaims) : null;
  } catch {
    return null;
  }
}

function parseHeader(segment: string): boolean {
  try {
    const header = JSON.parse(new TextDecoder().decode(bytesFromBase64Url(segment))) as { alg?: unknown };
    return header.alg === HEADER.alg;
  } catch {
    return false;
  }
}

/** Valida assinatura (tempo constante via `subtle.verify`), formato, uso e validade. */
export async function verifySessionToken(
  token: string,
  secret: string,
  options: { use?: TokenUse; nowSeconds?: number } = {},
): Promise<VerifyResult> {
  const parts = token.split('.');
  if (parts.length !== 3 || !parseHeader(parts[0])) return { ok: false, reason: 'malformed' };
  const claims = parseClaims(parts[1]);
  if (!claims) return { ok: false, reason: 'malformed' };
  let signature: Uint8Array;
  try {
    signature = bytesFromBase64Url(parts[2]);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  const key = await importKey(secret, 'verify');
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    signature as Uint8Array<ArrayBuffer>,
    encoder.encode(`${parts[0]}.${parts[1]}`),
  );
  if (!valid) return { ok: false, reason: 'signature' };
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (claims.exp <= now) return { ok: false, reason: 'expired' };
  if (claims.use !== (options.use ?? 'access')) return { ok: false, reason: 'wrong-use' };
  return { ok: true, claims };
}

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  /** Expiração do token de acesso, em milissegundos desde a época (para o app). */
  expiresAt: number;
  kind: SessionKind;
}

/** Emite o par acesso + renovação para um sujeito. */
export async function issueSession(
  sub: string,
  kind: SessionKind,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<IssuedSession> {
  const refreshTtl = kind === 'user' ? USER_REFRESH_TTL_SECONDS : GUEST_REFRESH_TTL_SECONDS;
  const base = { sub, kind, iat: nowSeconds };
  const [accessToken, refreshToken] = await Promise.all([
    signSessionToken({ ...base, use: 'access', exp: nowSeconds + ACCESS_TTL_SECONDS }, secret),
    signSessionToken({ ...base, use: 'refresh', exp: nowSeconds + refreshTtl }, secret),
  ]);
  return { accessToken, refreshToken, expiresAt: (nowSeconds + ACCESS_TTL_SECONDS) * 1000, kind };
}

/** Pseudônimo estável e não reversível para um identificador (ex.: CPF do gov.br). */
export async function pseudonymize(value: string, secret: string): Promise<string> {
  const key = await importKey(secret, 'sign');
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`sub:${value}`)));
  return base64UrlFromBytes(digest.slice(0, 18));
}

/** Identificador aleatório para convidados. */
export function randomGuestId(): string {
  return `guest_${base64UrlFromBytes(crypto.getRandomValues(new Uint8Array(12)))}`;
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}
