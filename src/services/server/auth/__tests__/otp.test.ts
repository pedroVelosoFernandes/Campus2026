/**
 * @jest-environment node
 */
import { formatBrPhone, maskE164, normalizeBrMobile } from '@/features/auth/phone';

import type { ServerEnv } from '../../env';
import { createAuthLimits, handleOtpStart, handleOtpVerify } from '../handlers';
import { createDevOtpProvider, createTwilioVerifyProvider, resolveOtpProvider, type OtpProvider } from '../otp-provider';
import { verifySessionToken } from '../token';

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres';
const env: ServerEnv = { APP_SESSION_SECRET: SECRET, NODE_ENV: 'development' };
const PHONE = '(11) 98765-4321';

let clock = 1_800_000_000_000;
const now = () => clock;

function post(body: unknown, ip = '10.2.2.2') {
  return new Request('http://localhost/api/auth/otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

const silentDev = () => createDevOtpProvider(() => {});

describe('celular brasileiro', () => {
  it.each([
    ['(11) 98765-4321', '+5511987654321'],
    ['11987654321', '+5511987654321'],
    ['+55 11 98765-4321', '+5511987654321'],
    ['5511987654321', '+5511987654321'],
    ['011987654321', '+5511987654321'],
  ])('normaliza %s', (input, expected) => expect(normalizeBrMobile(input)).toBe(expected));

  it.each(['1187654321', '(01) 98765-4321', '+1 415 555 0100', '11 8765-43210', ''])('recusa %s', (input) =>
    expect(normalizeBrMobile(input)).toBeNull(),
  );

  it('máscara de digitação e exibição', () => {
    expect(formatBrPhone('1')).toBe('(1');
    expect(formatBrPhone('11987')).toBe('(11) 987');
    expect(formatBrPhone('11987654321')).toBe('(11) 98765-4321');
    expect(maskE164('+5511987654321')).toBe('(11) •••••-4321');
  });
});

describe('fornecedor de SMS', () => {
  it('Twilio Verify envia com Basic auth e confere o código', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(Response.json({ status: 'pending' }, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ status: 'approved' }))
      .mockResolvedValueOnce(new Response('', { status: 404 }));
    const twilio = createTwilioVerifyProvider({ accountSid: 'AC1', authToken: 'tok', serviceSid: 'VA1' }, fetchImpl);

    expect(await twilio.start('+5511987654321')).toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://verify.twilio.com/v2/Services/VA1/Verifications');
    expect(init.headers.Authorization).toBe(`Basic ${btoa('AC1:tok')}`);
    expect(init.body).toContain('Channel=sms');
    expect(await twilio.check('+5511987654321', '123456')).toBe('approved');
    expect(await twilio.check('+5511987654321', '123456')).toBe('expired');
  });

  it('modo de desenvolvimento só fora de produção e sem Twilio', () => {
    expect(resolveOtpProvider({ NODE_ENV: 'development' }, fetch)?.name).toBe('dev');
    expect(resolveOtpProvider({ NODE_ENV: 'production' }, fetch)).toBeNull();
    const twilioEnv = { NODE_ENV: 'production', TWILIO_ACCOUNT_SID: 'a', TWILIO_AUTH_TOKEN: 'b', TWILIO_VERIFY_SERVICE_SID: 'c' };
    expect(resolveOtpProvider(twilioEnv, fetch)?.name).toBe('twilio');
  });
});

describe('POST /api/auth/otp/start e /verify', () => {
  beforeEach(() => {
    clock += 60 * 60_000;
  });

  it('fluxo completo: envia, confere e emite sessão sem o telefone no token', async () => {
    const limits = createAuthLimits(now);
    const deps = { provider: silentDev(), now };
    const started = await handleOtpStart(post({ phone: PHONE }), env, limits, deps);
    expect(await started.json()).toEqual({ sent: true, retryAfterSeconds: 30, dev: true });

    const verified = await handleOtpVerify(post({ phone: PHONE, code: '123456' }), env, limits, deps);
    const body = await verified.json();
    expect(verified.status).toBe(200);
    expect(body.user.phoneMasked).toBe('(11) •••••-4321');
    expect(JSON.stringify(body)).not.toContain('987654321');
    const claims = await verifySessionToken(body.session.accessToken, SECRET, { nowSeconds: clock / 1000 });
    expect(claims.ok && claims.claims).toMatchObject({ kind: 'user' });
    expect(claims.ok && claims.claims.sub).toMatch(/^phone_/);
  });

  it('400 para celular inválido; 501 sem fornecedor (produção sem Twilio)', async () => {
    const limits = createAuthLimits(now);
    expect((await handleOtpStart(post({ phone: '123' }), env, limits, { provider: silentDev() })).status).toBe(400);
    expect((await handleOtpStart(post({ phone: PHONE }), { ...env, NODE_ENV: 'production' }, limits)).status).toBe(501);
  });

  it('limita reenvio por número (30 s) e tentativas de código', async () => {
    const limits = createAuthLimits(now);
    const deps = { provider: silentDev(), now };
    expect((await handleOtpStart(post({ phone: PHONE }), env, limits, deps)).status).toBe(200);
    expect((await handleOtpStart(post({ phone: PHONE }, '10.3.3.3'), env, limits, deps)).status).toBe(429);

    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await handleOtpVerify(post({ phone: PHONE, code: '000000' }), env, limits, deps)).status);
    }
    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
  });

  it('código expirado no fornecedor → 401 com mensagem própria', async () => {
    const provider: OtpProvider = { name: 'twilio', start: async () => ({ ok: true }), check: async () => 'expired' };
    const response = await handleOtpVerify(post({ phone: PHONE, code: '111111' }), env, createAuthLimits(now), { provider });
    expect(response.status).toBe(401);
    expect((await response.json()).error).toContain('expirado');
  });
});
