import { SYMPTOM_TOOL_NAME, UNITS_TOOL_NAME, type ToolName } from '@/features/voice/tools';
import type { HealthService, UnitSearchResult } from '@/services/health-units/types';
import type { SymptomInput, SymptomResult } from '@/services/symptom-model/types';

/**
 * "Cérebro" falso da conversa simulada: identifica a intenção por palavras-chave
 * (inclusive algumas gírias) e decide qual ferramenta o GPT Live chamaria.
 * Só para demo — o modelo real entende linguagem natural de verdade.
 */

export type MockIntent =
  | { kind: 'tool'; name: ToolName; args: Record<string, unknown>; preface: string }
  | { kind: 'reply'; text: string };

export const EMERGENCY_REPLY =
  'Isso pode ser grave. Ligue agora para o 192, o SAMU, ou vá à UPA ou pronto-socorro mais próximo. ' +
  'Não espere melhorar sozinho.';

export const HELP_REPLY =
  'Posso te ajudar a encontrar vacina, entender onde procurar atendimento por sintomas, ' +
  'fazer teleconsulta ou marcar consulta de rotina. O que você precisa?';

const RED_FLAGS = /dor no peito|falta de ar|sem ar|desmai|convuls|boca torta|fala enrolada|sangrando muito/;
const SYMPTOM_WORDS: [RegExp, string][] = [
  [/febre|quentura/, 'febre'],
  [/dor de cabe[cç]a/, 'dor de cabeça'],
  [/tosse/, 'tosse'],
  [/dor de garganta/, 'dor de garganta'],
  [/dor nos quarto|dor nas costas/, 'dor nas costas'],
  [/diarreia|caganeira/, 'diarreia'],
  [/v[oô]mito|enjoo|gastura/, 'enjoo'],
];

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFC');
}

function unitsIntent(servico: HealthService, preface: string): MockIntent {
  return { kind: 'tool', name: UNITS_TOOL_NAME, args: { servico }, preface };
}

export function routeMockIntent(rawText: string): MockIntent {
  const text = normalize(rawText);
  if (RED_FLAGS.test(text)) return { kind: 'reply', text: EMERGENCY_REPLY };
  if (/vacina|vacinar|imuniz/.test(text)) return unitsIntent('vacinacao', 'Vou ver onde você pode se vacinar.');
  if (/sem sair de casa|teleconsulta|online|pela internet|remot/.test(text)) {
    return unitsIntent('teleconsulta', 'Vou ver as opções de atendimento a distância.');
  }
  const sintomas = SYMPTOM_WORDS.filter(([pattern]) => pattern.test(text)).map(([, name]) => name);
  if (sintomas.length > 0 || /t[oô] ruim|baqueado|passando mal|sintoma/.test(text)) {
    const args: SymptomInput = { sintomas: sintomas.length > 0 ? sintomas : ['mal-estar'] };
    const duration = /(\d+|um|uma|dois|duas|tr[eê]s) (dias?|semanas?)\b/.exec(text);
    if (duration) args.duracao = duration[0];
    return { kind: 'tool', name: SYMPTOM_TOOL_NAME, args: { ...args }, preface: 'Certo, vou analisar o que você contou.' };
  }
  if (/rotina|marcar consulta|check.?up|consulta/.test(text)) {
    return unitsIntent('consulta_rotina', 'A consulta de rotina é na UBS. Vou ver a mais indicada.');
  }
  if (/\bupa\b|urg[eê]ncia/.test(text)) return unitsIntent('upa', 'Vou procurar unidades de urgência.');
  if (/perto|unidade|posto|ubs/.test(text)) return unitsIntent('ubs', 'Vou procurar unidades perto de você.');
  return { kind: 'reply', text: HELP_REPLY };
}

function describeUnits(result: UnitSearchResult): string {
  const [first, second] = result.units;
  if (!first) return result.notice;
  const where = first.address ? `, na ${first.address}` : '';
  const distance = first.distanceKm !== null ? `, a ${String(first.distanceKm).replace('.', ',')} km` : '';
  const parts = [`A opção mais indicada é ${first.name}${where}${distance}. Horário: ${first.hours}.`];
  parts.push(first.howToAccess);
  if (second) parts.push(`Outra opção é ${second.name}.`);
  parts.push(result.notice);
  return parts.join(' ');
}

/** Texto que o assistente simulado fala a partir do `function_call_output`. */
export function summarizeToolOutput(name: ToolName, output: string): string {
  try {
    const data = JSON.parse(output) as SymptomResult & UnitSearchResult;
    if (name === SYMPTOM_TOOL_NAME && typeof data.orientation === 'string') return data.orientation;
    if (name === UNITS_TOOL_NAME && Array.isArray(data.units)) return describeUnits(data);
  } catch {
    // cai na resposta segura abaixo
  }
  return 'Não consegui concluir agora. Por segurança, procure sua UBS ou ligue 136, o Disque Saúde.';
}
