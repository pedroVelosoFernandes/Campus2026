/** Variáveis de ambiente do SERVIDOR (rotas /api). Nunca use EXPO_PUBLIC_ para segredos. */
export interface ServerEnv {
  OPENAI_API_KEY?: string;
  /** Modelo de voz do GPT-Live (padrão `gpt-live-1`). */
  OPENAI_LIVE_MODEL?: string;
  /** Backend de delegação / modelo de sintomas (padrão `gpt-6-sol`, o GPT-Sol). */
  SYMPTOM_MODEL?: string;
  /** Origens web permitidas, separadas por vírgula (opcional). */
  ALLOWED_ORIGINS?: string;
}

export function readServerEnv(): ServerEnv {
  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_LIVE_MODEL: process.env.OPENAI_LIVE_MODEL,
    SYMPTOM_MODEL: process.env.SYMPTOM_MODEL,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  };
}

export function missingKeyResponse(): Response {
  return Response.json({ error: 'OPENAI_API_KEY não configurada no servidor' }, { status: 500 });
}
