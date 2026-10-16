/**
 * @jest-environment node
 */
import { POST as liveSessionPOST } from '@/app/api/live-session+api';

import type { ServerEnv } from '../../env';
import { createRequestGuard } from '../../request-guard';
import { createAuthLimits, handleSessionGrant } from '../handlers';
import { issueSession, signSessionToken, verifySessionToken } from '../token';

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres';
const env: ServerEnv = { APP_SESSION_SECRET: SECRET };

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.1.1.1', ...headers },
    body: JSON.stringify(body),
  });
}

describe('guard de sessão', () => {
  const guard = createRequestGuard({ requireSession: { secret: () => SECRET }, maxRequests: 4, guestMaxRequests: 2 });

  it('401 sem token, com token inválido ou expirado', async () => {
    expect((await guard(post({})))?.status).toBe(401);
    expect((await guard(post({}, { Authorization: 'Bearer lixo' })))?.status).toBe(401);
    const expired = await signSessionToken({ sub: 'u', kind: 'user', use: 'access', iat: 1, exp: 2 }, SECRET);
    const response = await guard(post({}, { Authorization: `Bearer ${expired}` }));
    expect(response?.status).toBe(401);
    expect(response?.headers.get('WWW-Authenticate')).toContain('Bearer');
  });

  it('deixa passar token válido (null) e limita convidados mais cedo', async () => {
    const user = await issueSession('u-ok', 'user', SECRET);
    const guest = await issueSession('g-1', 'guest', SECRET);
    expect(await guard(post({}, { Authorization: `Bearer ${user.accessToken}` }))).toBeNull();
    const guestStatuses = [];
    for (let i = 0; i < 3; i++) {
      const result = await guard(post({}, { Authorization: `Bearer ${guest.accessToken}`, 'x-forwarded-for': '10.9.9.9' }));
      guestStatuses.push(result?.status ?? 200);
    }
    expect(guestStatuses).toEqual([200, 200, 429]);
  });

  it('500 quando o segredo não está configurado (falha fechada)', async () => {
    const noSecret = createRequestGuard({ requireSession: { secret: () => undefined } });
    expect((await noSecret(post({})))?.status).toBe(500);
  });

  it('as rotas /api exigem token (401 sem Authorization)', async () => {
    const original = process.env;
    process.env = { ...original, OPENAI_API_KEY: 'sk', APP_SESSION_SECRET: SECRET };
    const request = new Request('http://localhost/api/live-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: 'v=0',
    });
    expect((await liveSessionPOST(request)).status).toBe(401);
    process.env = original;
  });
});

describe('POST /api/auth/session', () => {
  it('emite sessão de convidado e renova com o refresh token', async () => {
    const limits = createAuthLimits();
    const guest = await (await handleSessionGrant(post({ grant: 'guest' }), env, limits)).json();
    expect(guest.session.kind).toBe('guest');
    const verified = await verifySessionToken(guest.session.accessToken, SECRET);
    expect(verified.ok && verified.claims.sub).toMatch(/^guest_/);

    const refreshed = await handleSessionGrant(post({ grant: 'refresh', refreshToken: guest.session.refreshToken }), env, limits);
    expect(refreshed.status).toBe(200);
    expect((await refreshed.json()).session.kind).toBe('guest');
  });

  it('401 para refresh inválido; 400 para grant desconhecido', async () => {
    const limits = createAuthLimits();
    const access = (await issueSession('u', 'user', SECRET)).accessToken;
    expect((await handleSessionGrant(post({ grant: 'refresh', refreshToken: access }), env, limits)).status).toBe(401);
    expect((await handleSessionGrant(post({ grant: 'senha' }), env, limits)).status).toBe(400);
  });
});
