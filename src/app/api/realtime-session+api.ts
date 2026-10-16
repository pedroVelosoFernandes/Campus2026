import { handleRealtimeSession } from '@/services/server/realtime-session';

// Rota de servidor: a chave da OpenAI só existe aqui e nunca vai para o app.
export function POST(): Promise<Response> {
  return handleRealtimeSession({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_REALTIME_MODEL: process.env.OPENAI_REALTIME_MODEL,
  });
}
