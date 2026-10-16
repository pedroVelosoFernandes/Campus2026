import {
  buildSymptomPrompt,
  createFallbackResult,
  FALLBACK_ORIENTATION,
  parseSymptomInput,
  parseSymptomResult,
} from '@/services/symptom-model';

describe('parseSymptomInput', () => {
  it('aceita entrada válida e normaliza espaços', () => {
    const result = parseSymptomInput({
      sintomas: [' febre ', 'dor de cabeça'],
      duracao: '2 dias',
      intensidade: 'moderada',
    });
    expect(result).toEqual({
      ok: true,
      value: { sintomas: ['febre', 'dor de cabeça'], duracao: '2 dias', intensidade: 'moderada' },
    });
  });

  it.each([
    ['não objeto', 'febre'],
    ['sem sintomas', {}],
    ['lista vazia', { sintomas: [] }],
    ['sintoma vazio', { sintomas: ['febre', '  '] }],
    ['sintoma não texto', { sintomas: [42] }],
    ['intensidade inválida', { sintomas: ['febre'], intensidade: 'extrema' }],
    ['duracao não texto', { sintomas: ['febre'], duracao: 2 }],
    ['sintomas demais', { sintomas: Array.from({ length: 21 }, (_, i) => `s${i}`) }],
  ])('rejeita %s', (_label, raw) => {
    expect(parseSymptomInput(raw).ok).toBe(false);
  });
});

describe('parseSymptomResult', () => {
  const valid = {
    urgency: 'pouco_urgente',
    orientation: '  Procure a UBS.  ',
    recommendedCare: 'ubs',
    warningSigns: ['falta de ar', 3, ''],
  };

  it('aceita objeto válido e limpa os campos', () => {
    expect(parseSymptomResult(valid)).toEqual({
      urgency: 'pouco_urgente',
      orientation: 'Procure a UBS.',
      recommendedCare: 'ubs',
      warningSigns: ['falta de ar'],
      source: 'model',
    });
  });

  it('aceita string JSON', () => {
    expect(parseSymptomResult(JSON.stringify(valid)).source).toBe('model');
  });

  it.each([
    ['JSON inválido', '{nope'],
    ['null', null],
    ['urgência desconhecida', { ...valid, urgency: 'talvez' }],
    ['atendimento desconhecido', { ...valid, recommendedCare: 'farmacia' }],
    ['orientação vazia', { ...valid, orientation: ' ' }],
  ])('usa o fallback seguro para %s', (_label, raw) => {
    const result = parseSymptomResult(raw);
    expect(result).toEqual(createFallbackResult());
    expect(result.orientation).toBe(FALLBACK_ORIENTATION);
    expect(result.orientation).toContain('192');
  });

  it('força SAMU em emergência e evita autocuidado em urgência', () => {
    expect(parseSymptomResult({ ...valid, urgency: 'emergencia', recommendedCare: 'ubs' }).recommendedCare).toBe(
      'samu',
    );
    expect(parseSymptomResult({ ...valid, urgency: 'urgente', recommendedCare: 'autocuidado' }).recommendedCare).toBe(
      'upa',
    );
  });
});

describe('buildSymptomPrompt', () => {
  it('inclui apenas os campos presentes', () => {
    const prompt = buildSymptomPrompt({ sintomas: ['febre', 'tosse'], duracao: '3 dias' });
    expect(prompt).toContain('febre; tosse');
    expect(prompt).toContain('Duração: 3 dias');
    expect(prompt).not.toContain('Intensidade');
    expect(prompt).not.toContain('Observações');
  });
});
