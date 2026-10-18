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
  /** ElevenLabs (voz sintetizada). Opcional; a chave nunca vai para o app. */
  ELEVENLABS_API_KEY?: string;
  /** Voz da ElevenLabs a usar (id da voz no painel da ElevenLabs). */
  ELEVENLABS_VOICE_ID?: string;
  /** Modelo de voz da ElevenLabs (opcional; vazio usa o padrão da conta). */
  ELEVENLABS_MODEL_ID?: string;
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
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID,
    ELEVENLABS_MODEL_ID: process.env.ELEVENLABS_MODEL_ID,
    NODE_ENV: process.env.NODE_ENV,
  };
}

export function missingKeyResponse(): Response {
  return Response.json({ error: 'OPENAI_API_KEY não configurada no servidor' }, { status: 500 });
}

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId?: string;
  modelId?: string;
}

/** Configuração da ElevenLabs, ou `null` quando a chave não foi preenchida. */
export function readElevenLabsConfig(env: ServerEnv = readServerEnv()): ElevenLabsConfig | null {
  const apiKey = env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    voiceId: env.ELEVENLABS_VOICE_ID?.trim() || undefined,
    modelId: env.ELEVENLABS_MODEL_ID?.trim() || undefined,
  };
}
