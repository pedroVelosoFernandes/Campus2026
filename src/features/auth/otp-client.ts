import type { FetchLike } from '@/services/symptom-model/types';

import { DEMO_OTP_CODE, apiEndpoint } from './config';
import { isOtpCode, maskE164, normalizeBrMobile } from './phone';
import type { AuthUser, IssuedSession } from './types';

/**
 * Chamadas do login por celular. Sem servidor (`EXPO_PUBLIC_API_URL` vazia)
 * roda em modo demonstração: nada sai do aparelho e o código é `123456`.
 */

export type RequestCodeResult =
  | { ok: true; retryAfterSeconds: number; hint?: string }
  | { ok: false; error: string };

export type VerifyCodeResult =
  | { ok: true; user: AuthUser; session?: IssuedSession }
  | { ok: false; error: string };

export interface OtpClient {
  requestCode(phone: string): Promise<RequestCodeResult>;
  verifyCode(phone: string, code: string): Promise<VerifyCodeResult>;
}

export const DEFAULT_RESEND_SECONDS = 30;
const DEMO_HINT = `Modo demonstração: use o código ${DEMO_OTP_CODE}.`;
const NETWORK_ERROR = 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
const INVALID_PHONE = 'Informe um celular válido com DDD.';

async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown };
    return typeof data.error === 'string' ? data.error : fallback;
  } catch {
    return fallback;
  }
}

function createDemoOtpClient(): OtpClient {
  return {
    async requestCode(phone) {
      if (!normalizeBrMobile(phone)) return { ok: false, error: INVALID_PHONE };
      return { ok: true, retryAfterSeconds: DEFAULT_RESEND_SECONDS, hint: DEMO_HINT };
    },
    async verifyCode(phone, code) {
      const e164 = normalizeBrMobile(phone);
      if (!e164) return { ok: false, error: INVALID_PHONE };
      if (code !== DEMO_OTP_CODE) return { ok: false, error: 'Código incorreto.' };
      return { ok: true, user: { id: 'demo', phoneMasked: maskE164(e164), demo: true } };
    },
  };
}

export function createOtpClient(options: { apiUrl?: string; fetchImpl?: FetchLike }): OtpClient {
  const { apiUrl } = options;
  if (!apiUrl) return createDemoOtpClient();
  const doFetch: FetchLike = options.fetchImpl ?? ((url, init) => fetch(url, init));
  const post = (path: string, body: unknown) =>
    doFetch(apiEndpoint(apiUrl, path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  return {
    async requestCode(phone) {
      const e164 = normalizeBrMobile(phone);
      if (!e164) return { ok: false, error: INVALID_PHONE };
      try {
        const response = await post('/api/auth/otp/start', { phone: e164 });
        if (!response.ok) return { ok: false, error: await errorMessage(response, 'Não foi possível enviar o SMS.') };
        const data = (await response.json()) as { retryAfterSeconds?: unknown; dev?: unknown };
        return {
          ok: true,
          retryAfterSeconds: typeof data.retryAfterSeconds === 'number' ? data.retryAfterSeconds : DEFAULT_RESEND_SECONDS,
          hint: data.dev === true ? `Ambiente de desenvolvimento: use o código ${DEMO_OTP_CODE}.` : undefined,
        };
      } catch {
        return { ok: false, error: NETWORK_ERROR };
      }
    },
    async verifyCode(phone, code) {
      const e164 = normalizeBrMobile(phone);
      if (!e164) return { ok: false, error: INVALID_PHONE };
      if (!isOtpCode(code)) return { ok: false, error: 'O código tem 6 números.' };
      try {
        const response = await post('/api/auth/otp/verify', { phone: e164, code });
        if (!response.ok) return { ok: false, error: await errorMessage(response, 'Código incorreto.') };
        const data = (await response.json()) as { session: IssuedSession; user: { id: string; phoneMasked: string } };
        return { ok: true, session: data.session, user: { id: data.user.id, phoneMasked: data.user.phoneMasked } };
      } catch {
        return { ok: false, error: NETWORK_ERROR };
      }
    },
  };
}
