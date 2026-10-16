import { executeToolCall, type ToolDependencies } from '@/features/voice/tool-call';
import { SYMPTOM_TOOL_NAME, UNITS_TOOL_NAME } from '@/features/voice/tools';
import { MOCK_HEALTH_UNITS, MOCK_USER_LOCATION } from '@/mocks/health-units';
import { createLocalUnitFinder } from '@/services/health-units/local-finder';

function deps(extra: Partial<ToolDependencies> = {}): ToolDependencies {
  return { unitFinder: createLocalUnitFinder(MOCK_HEALTH_UNITS), ...extra };
}

const assessment = {
  urgency: 'nao_urgente',
  orientation: 'Descanse e hidrate-se.',
  recommendedCare: 'autocuidado',
  warningSigns: ['falta de ar'],
};

const call = (name: string, args: unknown) => ({
  name,
  arguments: typeof args === 'string' ? args : JSON.stringify(args),
});

describe('executeToolCall: registrar_orientacao_sintomas', () => {
  it('valida a avaliação do modelo e devolve o resultado como output', async () => {
    const { output, outcome } = await executeToolCall(call(SYMPTOM_TOOL_NAME, assessment), deps());
    expect(outcome).toEqual({ tool: SYMPTOM_TOOL_NAME, result: { ...assessment, source: 'model' } });
    expect(JSON.parse(output)).toEqual({ ...assessment, source: 'model' });
  });

  it('aplica as regras de segurança (emergência sempre SAMU)', async () => {
    const { outcome } = await executeToolCall(
      call(SYMPTOM_TOOL_NAME, { ...assessment, urgency: 'emergencia', recommendedCare: 'ubs' }),
      deps(),
    );
    expect(outcome?.tool === SYMPTOM_TOOL_NAME && outcome.result.recommendedCare).toBe('samu');
  });

  it.each([
    ['JSON inválido', '{urgency: alta'],
    ['campos faltando', { orientation: 'ok' }],
    ['urgência desconhecida', { ...assessment, urgency: 'talvez' }],
  ])('%s -> fallback seguro que manda procurar atendimento', async (_label, args) => {
    const { output } = await executeToolCall(call(SYMPTOM_TOOL_NAME, args), deps());
    const parsed = JSON.parse(output);
    expect(parsed).toMatchObject({ source: 'fallback', recommendedCare: 'upa' });
    expect(parsed.orientation).toMatch(/procure atendimento/i);
    expect(parsed.orientation).toContain('192');
  });
});

describe('executeToolCall: buscar_unidades', () => {
  it('busca pelo serviço usando a localização disponível', async () => {
    const { output, outcome } = await executeToolCall(
      call(UNITS_TOOL_NAME, { servico: 'vacinacao' }),
      deps({ getCoordinates: async () => MOCK_USER_LOCATION }),
    );
    expect(outcome?.tool).toBe(UNITS_TOOL_NAME);
    const parsed = JSON.parse(output);
    expect(parsed.usedLocation).toBe(true);
    expect(parsed.units.length).toBeGreaterThan(0);
    for (const unit of parsed.units) expect(unit.services).toContain('vacinacao');
  });

  it('serviço inválido ou falha na busca -> resposta que aponta canais oficiais', async () => {
    const invalid = await executeToolCall(call(UNITS_TOOL_NAME, { servico: 'dentista_vip' }), deps());
    expect(JSON.parse(invalid.output)).toMatchObject({ units: [], notice: expect.stringContaining('136') });
    const broken = deps({ unitFinder: { find: async () => Promise.reject(new Error('offline')) } });
    const failed = await executeToolCall(call(UNITS_TOOL_NAME, { servico: 'upa' }), broken);
    expect(JSON.parse(failed.output)).toMatchObject({ servico: 'upa', units: [] });
  });

  it('localização indisponível não impede a busca', async () => {
    const { output } = await executeToolCall(
      call(UNITS_TOOL_NAME, { servico: 'upa' }),
      deps({ getCoordinates: async () => Promise.reject(new Error('negado')) }),
    );
    const parsed = JSON.parse(output);
    expect(parsed.usedLocation).toBe(false);
    expect(parsed.units[0].type).toBe('UPA');
  });
});

describe('executeToolCall: função desconhecida', () => {
  it('devolve erro como output (o backend precisa de um resultado para cada chamada)', async () => {
    const { output, outcome } = await executeToolCall(call('outra_funcao', {}), deps());
    expect(outcome).toBeNull();
    expect(JSON.parse(output).error).toContain('outra_funcao');
  });
});
