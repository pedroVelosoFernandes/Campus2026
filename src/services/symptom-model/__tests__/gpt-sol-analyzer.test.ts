import {
  createGptSolAnalyzer,
  createHttpSymptomAnalyzer,
  DEFAULT_SYMPTOM_MODEL,
  extractOutputText,
  OPENAI_RESPONSES_URL,
  SymptomModelError,
} from '@/services/symptom-model';

const modelOutput = {
  urgency: 'nao_urgente',
  orientation: 'Repouso e hidratação.',
  recommendedCare: 'autocuidado',
  warningSigns: [],
};

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function responsesPayload(text: string) {
  return {
    status: 'completed',
    output: [{ type: 'message', content: [{ type: 'output_text', text }] }],
  };
}

describe('extractOutputText', () => {
  it('lê o output_text da mensagem', () => {
    expect(extractOutputText(responsesPayload('{"a":1}'))).toBe('{"a":1}');
  });

  it('retorna null para recusa ou resposta incompleta', () => {
    expect(extractOutputText({ output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'não' }] }] })).toBeNull();
    expect(extractOutputText({ status: 'incomplete', output: [] })).toBeNull();
  });
});

describe('createGptSolAnalyzer', () => {
  it('chama a Responses API com schema estrito e o modelo padrão gpt-sol', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(responsesPayload(JSON.stringify(modelOutput))));
    const analyzer = createGptSolAnalyzer({ apiKey: 'sk-test', fetchImpl });

    const result = await analyzer.analyze({ sintomas: ['coriza'] });

    expect(result).toMatchObject({ urgency: 'nao_urgente', source: 'model' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(OPENAI_RESPONSES_URL);
    expect(init.headers.Authorization).toBe('Bearer sk-test');
    const body = JSON.parse(init.body);
    expect(body.model).toBe(DEFAULT_SYMPTOM_MODEL);
    expect(body.text.format).toMatchObject({ type: 'json_schema', strict: true });
    expect(body.input[0].content).toContain('coriza');
  });

  it('usa o modelo configurado', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(responsesPayload(JSON.stringify(modelOutput))));
    await createGptSolAnalyzer({ apiKey: 'k', model: 'meu-modelo', fetchImpl }).analyze({ sintomas: ['x'] });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).model).toBe('meu-modelo');
  });

  it('lança SymptomModelError em erro HTTP', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({}, 429));
    await expect(createGptSolAnalyzer({ apiKey: 'k', fetchImpl }).analyze({ sintomas: ['x'] })).rejects.toBeInstanceOf(
      SymptomModelError,
    );
  });

  it('cai no fallback quando a saída não é JSON válido', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(responsesPayload('não é json')));
    const result = await createGptSolAnalyzer({ apiKey: 'k', fetchImpl }).analyze({ sintomas: ['x'] });
    expect(result.source).toBe('fallback');
  });
});

describe('createHttpSymptomAnalyzer', () => {
  it('chama a rota do nosso servidor sem enviar chave', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ ...modelOutput, source: 'model' }));
    const result = await createHttpSymptomAnalyzer('http://api.local/', fetchImpl).analyze({ sintomas: ['x'] });
    expect(fetchImpl.mock.calls[0][0]).toBe('http://api.local/api/analyze-symptoms');
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(result.urgency).toBe('nao_urgente');
  });
});
