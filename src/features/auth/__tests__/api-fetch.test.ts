import { createApiFetch } from '../api-fetch';
import { resolveRouteAccess } from '../access';
import { createOtpClient } from '../otp-client';
import { REFRESH_MARGIN_MS, SESSION_KEY, createSessionClient } from '../session-client';
import { createMemoryStore, readOnboardingDone, saveOnboardingDone } from '../storage';

const API = 'https://api.exemplo.gov';
const NOW = 1_800_000_000_000;

function sessionResponse(access: string, refresh = `r-${access}`) {
  return Response.json({ session: { accessToken: access, refreshToken: refresh, expiresAt: NOW + 15 * 60_000, kind: 'guest' } });
}

describe('apiFetch', () => {
  it('pede sessão de convidado e anexa Authorization: Bearer', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(sessionResponse('a1')).mockResolvedValueOnce(Response.json({ ok: true }));
    const client = createSessionClient({ apiUrl: API, store: createMemoryStore(), fetchImpl, now: () => NOW });
    const apiFetch = createApiFetch(client, fetchImpl);

    await apiFetch(`${API}/api/assistant-text`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });

    expect(fetchImpl.mock.calls[0][0]).toBe(`${API}/api/auth/session`);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ grant: 'guest' });
    expect(fetchImpl.mock.calls[1][1].headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer a1' });
  });

  it('no 401 renova com o refresh token e repete uma vez', async () => {
    const store = createMemoryStore({
      [SESSION_KEY]: JSON.stringify({ mode: 'user', accessToken: 'velho', refreshToken: 'rt', expiresAt: NOW + 10 * 60_000 }),
    });
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(sessionResponse('novo'))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    const client = createSessionClient({ apiUrl: API, store, fetchImpl, now: () => NOW });
    await client.load();

    const response = await createApiFetch(client, fetchImpl)(`${API}/api/live-session`, { method: 'POST' });

    expect(response.status).toBe(200);
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer velho');
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({ grant: 'refresh', refreshToken: 'rt' });
    expect(fetchImpl.mock.calls[2][1].headers.Authorization).toBe('Bearer novo');
    expect(JSON.parse((await store.getItem(SESSION_KEY)) ?? '{}')).toMatchObject({ mode: 'user', accessToken: 'novo' });
  });

  it('renova antes de expirar e compartilha a renovação entre chamadas simultâneas', async () => {
    const store = createMemoryStore({
      [SESSION_KEY]: JSON.stringify({ mode: 'guest', accessToken: 'quase', refreshToken: 'rt', expiresAt: NOW + REFRESH_MARGIN_MS - 1 }),
    });
    const fetchImpl = jest.fn().mockResolvedValueOnce(sessionResponse('fresco'));
    const client = createSessionClient({ apiUrl: API, store, fetchImpl, now: () => NOW });
    await client.load();
    const [a, b] = await Promise.all([client.getAccessToken(), client.getAccessToken()]);
    expect([a, b]).toEqual(['fresco', 'fresco']);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('sessão de usuário vencida vira convidado e avisa a interface', async () => {
    const store = createMemoryStore({ [SESSION_KEY]: JSON.stringify({ mode: 'user', refreshToken: 'vencido' }) });
    const fetchImpl = jest.fn().mockResolvedValueOnce(new Response('', { status: 401 })).mockResolvedValueOnce(sessionResponse('g1'));
    const client = createSessionClient({ apiUrl: API, store, fetchImpl, now: () => NOW });
    const expired = jest.fn();
    client.onExpired(expired);
    await client.load();
    expect(await client.getAccessToken()).toBe('g1');
    expect(expired).toHaveBeenCalled();
    expect(client.current()?.mode).toBe('guest');
  });

  it('sem servidor não anexa token (modo demonstração)', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(Response.json({}));
    const client = createSessionClient({ store: createMemoryStore(), fetchImpl });
    await createApiFetch(client, fetchImpl)('/x', { headers: {} });
    expect(fetchImpl.mock.calls[0][1].headers).toEqual({});
  });
});

describe('login por SMS no app', () => {
  it('modo demonstração aceita só 123456 e mascara o celular', async () => {
    const otp = createOtpClient({});
    expect(await otp.requestCode('11 98765-4321')).toMatchObject({ ok: true, hint: expect.stringContaining('123456') });
    expect(await otp.verifyCode('11987654321', '000000')).toEqual({ ok: false, error: 'Código incorreto.' });
    expect(await otp.verifyCode('11987654321', '123456')).toEqual({
      ok: true,
      user: { id: 'demo', phoneMasked: '(11) •••••-4321', demo: true },
    });
  });

  it('com servidor envia o celular em E.164 e repassa a mensagem de erro', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(Response.json({ sent: true, retryAfterSeconds: 30 }))
      .mockResolvedValueOnce(Response.json({ error: 'Código incorreto.' }, { status: 401 }));
    const otp = createOtpClient({ apiUrl: API, fetchImpl });
    expect(await otp.requestCode('(11) 98765-4321')).toEqual({ ok: true, retryAfterSeconds: 30, hint: undefined });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ phone: '+5511987654321' });
    expect(await otp.verifyCode('(11) 98765-4321', '111111')).toEqual({ ok: false, error: 'Código incorreto.' });
  });
});

describe('guardas de rota e onboarding', () => {
  it.each([
    ['primeiro uso', 'signedOut', false, { app: false, onboarding: true, login: false, entry: '/onboarding' }],
    ['onboarding feito, sem escolha', 'signedOut', true, { app: false, onboarding: false, login: true, entry: '/login' }],
    ['convidado', 'guest', true, { app: true, onboarding: false, login: true, entry: '/' }],
    ['logado', 'signedIn', true, { app: true, onboarding: false, login: true, entry: '/' }],
  ] as const)('%s', (_label, status, done, expected) => {
    expect(resolveRouteAccess(status, done)).toEqual(expected);
  });

  it('onboarding concluído fica salvo com a versão do consentimento', async () => {
    const store = createMemoryStore();
    expect(await readOnboardingDone(store)).toBe(false);
    await saveOnboardingDone(store, () => new Date('2026-10-16T12:00:00Z'));
    expect(await readOnboardingDone(store)).toBe(true);
    await store.setItem('alo-saude.onboarding', JSON.stringify({ consentVersion: 0 }));
    expect(await readOnboardingDone(store)).toBe(false);
  });
});
