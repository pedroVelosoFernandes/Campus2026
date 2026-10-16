/**
 * Configuração pública do login (vai para o bundle; nunca coloque segredos aqui).
 * Credenciais do SMS (Twilio) e o segredo das sessões ficam só no servidor.
 */

export interface AuthEnv {
  apiUrl?: string;
  termsUrl?: string;
  privacyUrl?: string;
}

const clean = (value: string | undefined) => value?.trim() || undefined;

export function readAuthEnv(): AuthEnv {
  return {
    apiUrl: clean(process.env.EXPO_PUBLIC_API_URL),
    termsUrl: clean(process.env.EXPO_PUBLIC_TERMS_URL),
    privacyUrl: clean(process.env.EXPO_PUBLIC_PRIVACY_URL),
  };
}

/** Sem servidor, o login por SMS roda em modo demonstração (código fixo, tudo local). */
export const isDemoAuth = (env: AuthEnv) => !env.apiUrl;

/** Código aceito no modo demonstração (sem servidor) e no adaptador de desenvolvimento. */
export const DEMO_OTP_CODE = '123456';

export const apiEndpoint = (apiUrl: string, path: string) => `${apiUrl.replace(/\/+$/, '')}${path}`;
