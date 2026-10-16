/**
 * @jest-environment node
 */
import { POST as analyzeSymptomsPOST } from '@/app/api/analyze-symptoms+api';
import { POST as realtimeSessionPOST } from '@/app/api/realtime-session+api';
import { SYMPTOM_TOOL_NAME, UNITS_TOOL_NAME } from '@/features/voice/tools';
import { OPENAI_RESPONSES_URL } from '@/services/symptom-model';

import { OPENAI_CLIENT_SECRETS_URL } from '../realtime-session';

const originalEnv = process.env;
const fetchMock = jest.fn();

beforeEach(() => {
  process.env = { ...originalEnv, OPENAI_API_KEY: 'sk-server-secret' };
  delete process.env.OPENAI_REALTIME_MODEL;
  delete process.env.SYMPTOM_MODEL;
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
  process.env = originalEnv;
});

function analyzeRequest(body: string) {
  return new Request('http://localhost/api/analyze-symptoms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

describe('POST /api/realtime-session', () => {
  it('500 sem OPENAI_API_KEY', async () => {
    delete process.env.OPENAI_API_KEY;
    const response = await realtimeSessionPOST();
    expect(response.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('gera client secret com a sessão configurada e não expõe a chave', async () => {
    process.env.OPENAI_REALTIME_MODEL = 'gpt-realtime-teste';
    fetchMock.mockResolvedValue(Response.json({ value: 'ek_123', expires_at: 1700000000 }));

    const response = await realtimeSessionPOST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ clientSecret: 'ek_123', expiresAt: 1700000000, model: 'gpt-realtime-teste' });
    expect(JSON.stringify(body)).not.toContain('sk-server-secret');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(OPENAI_CLIENT_SECRETS_URL);
    expect(init.headers.Authorization).toBe('Bearer sk-server-secret');
    const sent = JSON.parse(init.body);
    expect(sent.session).toMatchObject({ type: 'realtime', model: 'gpt-realtime-teste', tool_choice: 'auto' });
    expect(sent.session.tools.map((tool: { name: string }) => tool.name)).toEqual([SYMPTOM_TOOL_NAME, UNITS_TOOL_NAME]);
    expect(sent.session.instructions).toContain('192');
  });

  it('502 quando a OpenAI falha', async () => {
    fetchMock.mockResolvedValue(new Response('erro', { status: 401 }));
    expect((await realtimeSessionPOST()).status).toBe(502);
  });
});

describe('POST /api/analyze-symptoms', () => {
  const modelJson = {
    urgency: 'pouco_urgente',
    orientation: 'Procure a UBS.',
    recommendedCare: 'ubs',
    warningSigns: ['falta de ar'],
  };

  it('500 sem OPENAI_API_KEY', async () => {
    delete process.env.OPENAI_API_KEY;
    const response = await analyzeSymptomsPOST(analyzeRequest('{"sintomas":["febre"]}'));
    expect(response.status).toBe(500);
  });

  it.each([
    ['JSON malformado', '{sintomas'],
    ['sem sintomas', '{}'],
    ['intensidade inválida', '{"sintomas":["febre"],"intensidade":"altíssima"}'],
  ])('400 para %s', async (_label, body) => {
    const response = await analyzeSymptomsPOST(analyzeRequest(body));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('caminho feliz: chama o GPT-Sol e devolve resultado validado', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        status: 'completed',
        output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(modelJson) }] }],
      }),
    );
    const response = await analyzeSymptomsPOST(analyzeRequest('{"sintomas":["febre","dor de cabeça"],"duracao":"2 dias"}'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ...modelJson, source: 'model' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(OPENAI_RESPONSES_URL);
    expect(JSON.parse(init.body).model).toBe('gpt-sol');
  });

  it('usa SYMPTOM_MODEL do ambiente', async () => {
    process.env.SYMPTOM_MODEL = 'modelo-especializado-v1';
    fetchMock.mockResolvedValue(Response.json({ output: [] }));
    const response = await analyzeSymptomsPOST(analyzeRequest('{"sintomas":["febre"]}'));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('modelo-especializado-v1');
    // Saída vazia do modelo vira o fallback seguro.
    expect((await response.json()).source).toBe('fallback');
  });

  it('502 quando o modelo de sintomas falha', async () => {
    fetchMock.mockResolvedValue(new Response('erro', { status: 500 }));
    const response = await analyzeSymptomsPOST(analyzeRequest('{"sintomas":["febre"]}'));
    expect(response.status).toBe(502);
  });
});
