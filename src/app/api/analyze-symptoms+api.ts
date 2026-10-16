import { handleAnalyzeSymptoms } from '@/services/server/analyze-symptoms';

// Rota de servidor: a chave da OpenAI só existe aqui e nunca vai para o app.
export function POST(request: Request): Promise<Response> {
  return handleAnalyzeSymptoms(request, {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    SYMPTOM_MODEL: process.env.SYMPTOM_MODEL,
  });
}
