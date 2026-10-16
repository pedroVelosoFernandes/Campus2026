import { CARE_RECOMMENDATIONS, URGENCY_LEVELS, type SymptomInput } from './types';

export const SYMPTOM_SYSTEM_PROMPT = [
  'Você é um modelo de triagem de sintomas do Alô Saúde, assistente do SUS.',
  'Classifique a urgência com base nos sintomas relatados, seguindo a lógica de',
  'classificação de risco usada no SUS (Protocolo de Manchester como referência).',
  'Nunca dê diagnóstico definitivo nem prescreva medicamentos controlados.',
  'Se houver qualquer sinal de alarme (dor no peito, falta de ar intensa,',
  'desmaio, confusão, sinais de AVC, sangramento intenso, convulsão, febre alta',
  'com rigidez de nuca, ideação suicida), classifique como "emergencia" e',
  'recomende "samu" (ligar 192).',
  'Na dúvida entre dois níveis, escolha o mais urgente.',
  'A orientação deve ter no máximo 3 frases, em português do Brasil, linguagem',
  'simples, adequada para ser lida em voz alta.',
].join(' ');

export const SYMPTOM_RESULT_SCHEMA_NAME = 'analise_sintomas';

/** JSON Schema (modo strict) para Structured Outputs da Responses API. */
export const SYMPTOM_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    urgency: { type: 'string', enum: [...URGENCY_LEVELS] },
    orientation: { type: 'string' },
    recommendedCare: { type: 'string', enum: [...CARE_RECOMMENDATIONS] },
    warningSigns: { type: 'array', items: { type: 'string' } },
  },
  required: ['urgency', 'orientation', 'recommendedCare', 'warningSigns'],
  additionalProperties: false,
} as const;

/** Monta a mensagem do usuário enviada ao modelo de sintomas. Função pura. */
export function buildSymptomPrompt(input: SymptomInput): string {
  const lines = [`Sintomas relatados: ${input.sintomas.join('; ')}.`];
  if (input.duracao) lines.push(`Duração: ${input.duracao}.`);
  if (input.intensidade) lines.push(`Intensidade: ${input.intensidade}.`);
  if (input.observacoes) lines.push(`Observações: ${input.observacoes}.`);
  lines.push(
    'Classifique a urgência, indique o tipo de atendimento recomendado e liste os sinais de alerta.',
  );
  return lines.join('\n');
}
