/**
 * @jest-environment node
 */
import {
  ACCESS_TTL_SECONDS,
  bearerToken,
  issueSession,
  pseudonymize,
  signSessionToken,
  verifySessionToken,
  type SessionClaims,
} from '../token';

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres';
const NOW = 1_800_000_000;
const b64url = (text: string) => btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const claims: SessionClaims = { sub: 'u1', kind: 'user', use: 'access', iat: NOW, exp: NOW + 60 };

describe('token de sessão (HMAC JWT)', () => {
  it('assina e valida um token íntegro', async () => {
    const token = await signSessionToken(claims, SECRET);
    expect(token.split('.')).toHaveLength(3);
    expect(await verifySessionToken(token, SECRET, { nowSeconds: NOW + 1 })).toEqual({ ok: true, claims });
  });

  it('recusa token expirado', async () => {
    const token = await signSessionToken(claims, SECRET);
    expect(await verifySessionToken(token, SECRET, { nowSeconds: NOW + 60 })).toEqual({ ok: false, reason: 'expired' });
  });

  it('recusa assinatura com outro segredo ou payload adulterado', async () => {
    const token = await signSessionToken(claims, SECRET);
    expect((await verifySessionToken(token, `${SECRET}-outro`, { nowSeconds: NOW })).ok).toBe(false);
    const [header, , signature] = token.split('.');
    const forged = b64url(JSON.stringify({ ...claims, sub: 'admin' }));
    expect(await verifySessionToken(`${header}.${forged}.${signature}`, SECRET, { nowSeconds: NOW })).toEqual({
      ok: false,
      reason: 'signature',
    });
  });

  it('recusa formatos inválidos e alg diferente', async () => {
    expect((await verifySessionToken('abc', SECRET)).ok).toBe(false);
    const none = `${b64url('{"alg":"none"}')}.${b64url(JSON.stringify(claims))}.`;
    expect(await verifySessionToken(none, SECRET, { nowSeconds: NOW })).toEqual({ ok: false, reason: 'malformed' });
  });

  it('não aceita token de renovação como token de acesso', async () => {
    const session = await issueSession('u1', 'user', SECRET, NOW);
    expect(await verifySessionToken(session.refreshToken, SECRET, { nowSeconds: NOW })).toEqual({
      ok: false,
      reason: 'wrong-use',
    });
    expect((await verifySessionToken(session.refreshToken, SECRET, { use: 'refresh', nowSeconds: NOW })).ok).toBe(true);
    expect(session.expiresAt).toBe((NOW + ACCESS_TTL_SECONDS) * 1000);
  });

  it('pseudônimo é estável e não contém o CPF', async () => {
    const a = await pseudonymize('12345678909', SECRET);
    expect(a).toBe(await pseudonymize('12345678909', SECRET));
    expect(a).not.toContain('12345678909');
    expect(a).not.toBe(await pseudonymize('98765432100', SECRET));
  });

  it('lê o cabeçalho Bearer', () => {
    const request = (value?: string) =>
      new Request('http://x', value ? { headers: { Authorization: value } } : undefined);
    expect(bearerToken(request('Bearer abc.def.ghi'))).toBe('abc.def.ghi');
    expect(bearerToken(request('Basic xyz'))).toBeNull();
    expect(bearerToken(request())).toBeNull();
  });
});
