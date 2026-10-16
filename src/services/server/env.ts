/** Variáveis de ambiente do SERVIDOR (rotas /api). Nunca use EXPO_PUBLIC_ para segredos. */
export interface ServerEnv {
  OPENAI_API_KEY?: string;
  /** Modelo de voz do GPT-Live (padrão `gpt-live-1`). */
  OPENAI_LIVE_MODEL?: string;
  /** Backend de delegação / modelo de sintomas (padrão `gpt-6-sol`, o GPT-Sol). */
  SYMPTOM_MODEL?: string;
  /** Origens web permitidas, separadas por vírgula (opcional). */
  ALLOWED_ORIGINS?: string;
  /** Segredo HMAC (≥ 32 caracteres) dos tokens de sessão do app. Obrigatório. */
  APP_SESSION_SECRET?: string;
  /** Twilio Verify (código por SMS). Sem os três, só o modo de desenvolvimento funciona. */
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_VERIFY_SERVICE_SID?: string;
  NODE_ENV?: string;
}

export function readServerEnv(): ServerEnv {
  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_LIVE_MODEL: process.env.OPENAI_LIVE_MODEL,
    SYMPTOM_MODEL: process.env.SYMPTOM_MODEL,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    APP_SESSION_SECRET: process.env.APP_SESSION_SECRET,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_VERIFY_SERVICE_SID: process.env.TWILIO_VERIFY_SERVICE_SID,
    NODE_ENV: process.env.NODE_ENV,
  };
}

export function missingKeyResponse(): Response {
  return Response.json({ error: 'OPENAI_API_KEY não configurada no servidor' }, { status: 500 });
}
