import type { FetchLike } from '@/services/symptom-model/types';

import type { ServerEnv } from '../env';

/**
 * Envio e conferência do código por SMS atrás de uma interface, para trocar
 * de fornecedor sem mexer nas rotas. Adaptadores:
 * - Twilio Verify (produção): o Twilio gera, envia e confere o código;
 * - desenvolvimento: código fixo `123456`, só fora de produção e sem Twilio.
 */

export type OtpStartResult = { ok: true } | { ok: false; status: number; error: string };
export type OtpCheckResult = 'approved' | 'rejected' | 'expired' | 'error';

export interface OtpProvider {
  readonly name: 'twilio' | 'dev';
  start(phoneE164: string): Promise<OtpStartResult>;
  check(phoneE164: string, code: string): Promise<OtpCheckResult>;
}

export const DEV_OTP_CODE = '123456';
export const TWILIO_VERIFY_BASE = 'https://verify.twilio.com/v2/Services';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  serviceSid: string;
}

export function createTwilioVerifyProvider(config: TwilioConfig, fetchImpl: FetchLike): OtpProvider {
  const base = `${TWILIO_VERIFY_BASE}/${encodeURIComponent(config.serviceSid)}`;
  const headers = {
    Authorization: `Basic ${btoa(`${config.accountSid}:${config.authToken}`)}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  const post = (path: string, params: Record<string, string>) =>
    fetchImpl(`${base}/${path}`, { method: 'POST', headers, body: new URLSearchParams(params).toString() });

  return {
    name: 'twilio',
    async start(phone) {
      try {
        const response = await post('Verifications', { To: phone, Channel: 'sms', Locale: 'pt-br' });
        if (response.ok) return { ok: true };
        if (response.status === 429) return { ok: false, status: 429, error: 'Muitos códigos pedidos. Aguarde alguns minutos.' };
        return { ok: false, status: 502, error: 'Não foi possível enviar o SMS agora.' };
      } catch {
        return { ok: false, status: 502, error: 'Não foi possível enviar o SMS agora.' };
      }
    },
    async check(phone, code) {
      try {
        const response = await post('VerificationCheck', { To: phone, Code: code });
        // 404: verificação expirada, já usada ou tentativas esgotadas no Twilio.
        if (response.status === 404 || response.status === 429) return 'expired';
        if (!response.ok) return 'error';
        const data = (await response.json()) as { status?: unknown };
        return data.status === 'approved' ? 'approved' : 'rejected';
      } catch {
        return 'error';
      }
    },
  };
}

export function createDevOtpProvider(log: (message: string) => void = console.info): OtpProvider {
  return {
    name: 'dev',
    async start(phone) {
      log(`[otp:dev] Código para ${phone.slice(0, 5)}•••••${phone.slice(-4)}: ${DEV_OTP_CODE}`);
      return { ok: true };
    },
    async check(_phone, code) {
      return code === DEV_OTP_CODE ? 'approved' : 'rejected';
    },
  };
}

/** Twilio quando configurado; desenvolvimento só fora de produção; senão `null` (501). */
export function resolveOtpProvider(env: ServerEnv, fetchImpl: FetchLike): OtpProvider | null {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } = env;
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_VERIFY_SERVICE_SID) {
    return createTwilioVerifyProvider(
      { accountSid: TWILIO_ACCOUNT_SID, authToken: TWILIO_AUTH_TOKEN, serviceSid: TWILIO_VERIFY_SERVICE_SID },
      fetchImpl,
    );
  }
  return env.NODE_ENV === 'production' ? null : createDevOtpProvider();
}
