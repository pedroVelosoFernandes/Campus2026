import { SYMPTOM_TOOL_NAME, UNITS_TOOL_NAME } from '@/features/voice/tools';
import { EMERGENCY_REPLY, HELP_REPLY, routeMockIntent, summarizeToolOutput } from '@/mocks/mock-intents';

describe('routeMockIntent (os 5 casos da conversa simulada)', () => {
  it.each([
    ['Quero tomar a vacina contra a gripe', UNITS_TOOL_NAME, { servico: 'vacinacao' }],
    ['Quero fazer uma consulta sem sair de casa', UNITS_TOOL_NAME, { servico: 'teleconsulta' }],
    ['Preciso marcar uma consulta de rotina', UNITS_TOOL_NAME, { servico: 'consulta_rotina' }],
    ['Qual o posto mais perto?', UNITS_TOOL_NAME, { servico: 'ubs' }],
    ['Tô com quentura e tosse faz 2 dias', SYMPTOM_TOOL_NAME, { urgency: 'pouco_urgente', recommendedCare: 'ubs' }],
  ])('"%s" -> %s', (text, name, args) => {
    expect(routeMockIntent(text)).toMatchObject({ kind: 'tool', name, args });
  });

  it('sinal de alerta responde direto com SAMU 192', () => {
    expect(routeMockIntent('Meu pai está com dor no peito')).toEqual({ kind: 'reply', text: EMERGENCY_REPLY });
  });

  it('pedido não reconhecido explica o que o assistente faz', () => {
    expect(routeMockIntent('bom dia')).toEqual({ kind: 'reply', text: HELP_REPLY });
  });
});

describe('summarizeToolOutput', () => {
  it('fala a orientação do modelo de sintomas', () => {
    expect(summarizeToolOutput(SYMPTOM_TOOL_NAME, JSON.stringify({ orientation: 'Procure a UBS.' }))).toBe(
      'Procure a UBS.',
    );
  });

  it('descreve a primeira unidade e a limitação dos dados', () => {
    const output = JSON.stringify({
      servico: 'upa',
      usedLocation: true,
      notice: 'Confirme no 136.',
      units: [{ name: 'UPA X', address: 'Rua Y', distanceKm: 1.5, hours: '24h', howToAccess: 'Sem agendamento.' }],
    });
    const text = summarizeToolOutput(UNITS_TOOL_NAME, output);
    expect(text).toContain('UPA X');
    expect(text).toContain('1,5 km');
    expect(text).toContain('Confirme no 136.');
  });

  it('saída inválida vira orientação segura', () => {
    expect(summarizeToolOutput(UNITS_TOOL_NAME, 'nope')).toContain('136');
  });
});
