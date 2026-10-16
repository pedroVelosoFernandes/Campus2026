import { handleToolCall, type ToolDependencies } from '@/features/voice/tool-call';
import { SYMPTOM_TOOL_NAME, UNITS_TOOL_NAME } from '@/features/voice/tools';
import type { FunctionCallArgumentsDoneEvent } from '@/features/voice/types';
import { MOCK_HEALTH_UNITS, MOCK_USER_LOCATION } from '@/mocks/health-units';
import { createLocalUnitFinder } from '@/services/health-units/local-finder';
import type { SymptomAnalyzer, SymptomResult } from '@/services/symptom-model/types';

const okResult: SymptomResult = {
  urgency: 'nao_urgente',
  orientation: 'Descanse e hidrate-se.',
  recommendedCare: 'autocuidado',
  warningSigns: [],
  source: 'model',
};

function makeDeps(analyze: SymptomAnalyzer['analyze'], extra: Partial<ToolDependencies> = {}) {
  const analyzer = { analyze: jest.fn(analyze) };
  return { analyzer, unitFinder: createLocalUnitFinder(MOCK_HEALTH_UNITS), ...extra };
}

function callEvent(args: string, name: string = SYMPTOM_TOOL_NAME): FunctionCallArgumentsDoneEvent {
  return { type: 'response.function_call_arguments.done', call_id: 'call_42', name, arguments: args };
}

function outputOf(events: Awaited<ReturnType<typeof handleToolCall>>['events']) {
  const [create, respond] = events;
  if (create.type !== 'conversation.item.create' || create.item.type !== 'function_call_output') {
    throw new Error('primeiro evento deveria ser function_call_output');
  }
  expect(respond.type).toBe('response.create');
  expect(create.item.call_id).toBe('call_42');
  return JSON.parse(create.item.output);
}

describe('handleToolCall: analisar_sintomas', () => {
  it('envia os argumentos validados ao analisador e devolve output + response.create', async () => {
    const deps = makeDeps(async () => okResult);
    const { events, outcome } = await handleToolCall(
      callEvent(JSON.stringify({ sintomas: ['febre', 'dor de cabeça'], duracao: '2 dias', intensidade: 'leve' })),
      deps,
    );
    expect(deps.analyzer.analyze).toHaveBeenCalledWith(
      { sintomas: ['febre', 'dor de cabeça'], duracao: '2 dias', intensidade: 'leve' },
      {},
    );
    expect(outcome).toEqual({ tool: SYMPTOM_TOOL_NAME, result: okResult });
    expect(events).toHaveLength(2);
    expect(events[1]).toEqual({ type: 'response.create' });
    expect(outputOf(events)).toEqual(okResult);
  });

  it('JSON inválido nos argumentos -> fallback seguro sem chamar o analisador', async () => {
    const deps = makeDeps(async () => okResult);
    const { events, outcome } = await handleToolCall(callEvent('{sintomas: febre'), deps);
    expect(deps.analyzer.analyze).not.toHaveBeenCalled();
    expect(outcome?.tool === SYMPTOM_TOOL_NAME && outcome.result.source).toBe('fallback');
    expect(outputOf(events).orientation).toMatch(/procure atendimento/i);
  });

  it('argumentos com formato errado -> fallback seguro', async () => {
    const deps = makeDeps(async () => okResult);
    const { outcome } = await handleToolCall(callEvent(JSON.stringify({ sintomas: 'febre' })), deps);
    expect(deps.analyzer.analyze).not.toHaveBeenCalled();
    expect(outcome?.tool === SYMPTOM_TOOL_NAME && outcome.result.source).toBe('fallback');
  });

  it('falha do analisador -> fallback que manda procurar atendimento', async () => {
    const deps = makeDeps(async () => {
      throw new Error('timeout');
    });
    const { events } = await handleToolCall(callEvent(JSON.stringify({ sintomas: ['tosse'] })), deps);
    const output = outputOf(events);
    expect(output.source).toBe('fallback');
    expect(output.recommendedCare).toBe('upa');
    expect(output.orientation).toContain('192');
  });

  it('no modo texto pede a resposta seguinte só em texto', async () => {
    const { events } = await handleToolCall(callEvent('{"sintomas":["tosse"]}'), makeDeps(async () => okResult), {
      modalities: ['text'],
    });
    expect(events[1]).toEqual({ type: 'response.create', response: { output_modalities: ['text'] } });
  });
});

describe('handleToolCall: buscar_unidades', () => {
  it('busca pelo serviço usando a localização disponível', async () => {
    const deps = makeDeps(async () => okResult, { getCoordinates: async () => MOCK_USER_LOCATION });
    const { events, outcome } = await handleToolCall(callEvent('{"servico":"vacinacao"}', UNITS_TOOL_NAME), deps);
    expect(outcome?.tool).toBe(UNITS_TOOL_NAME);
    const output = outputOf(events);
    expect(output.usedLocation).toBe(true);
    expect(output.units.length).toBeGreaterThan(0);
    for (const unit of output.units) expect(unit.services).toContain('vacinacao');
    expect(deps.analyzer.analyze).not.toHaveBeenCalled();
  });

  it('serviço inválido ou falha na busca -> resposta que aponta canais oficiais', async () => {
    const invalid = await handleToolCall(callEvent('{"servico":"dentista_vip"}', UNITS_TOOL_NAME), makeDeps(async () => okResult));
    expect(outputOf(invalid.events)).toMatchObject({ units: [], notice: expect.stringContaining('136') });

    const broken = makeDeps(async () => okResult, {
      unitFinder: { find: async () => Promise.reject(new Error('offline')) },
    });
    const failed = await handleToolCall(callEvent('{"servico":"upa"}', UNITS_TOOL_NAME), broken);
    expect(outputOf(failed.events)).toMatchObject({ servico: 'upa', units: [] });
  });

  it('localização indisponível não impede a busca', async () => {
    const deps = makeDeps(async () => okResult, { getCoordinates: async () => Promise.reject(new Error('negado')) });
    const { events } = await handleToolCall(callEvent('{"servico":"upa"}', UNITS_TOOL_NAME), deps);
    const output = outputOf(events);
    expect(output.usedLocation).toBe(false);
    expect(output.units[0].type).toBe('UPA');
  });
});

describe('handleToolCall: função desconhecida', () => {
  it('devolve erro ao modelo sem chamar nada', async () => {
    const deps = makeDeps(async () => okResult);
    const { events, outcome } = await handleToolCall(callEvent('{}', 'outra_funcao'), deps);
    expect(deps.analyzer.analyze).not.toHaveBeenCalled();
    expect(outcome).toBeNull();
    expect(outputOf(events).error).toContain('outra_funcao');
  });
});
