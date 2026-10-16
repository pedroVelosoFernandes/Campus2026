import {
  CARE_RECOMMENDATIONS,
  SYMPTOM_INTENSITIES,
  URGENCY_LEVELS,
  type CareRecommendation,
  type SymptomInput,
  type SymptomResult,
  type UrgencyLevel,
} from './types';

const MAX_SYMPTOMS = 20;
const MAX_SYMPTOM_LENGTH = 200;
const MAX_TEXT_LENGTH = 1000;
const MAX_ORIENTATION_LENGTH = 1200;
const MAX_WARNING_SIGNS = 10;

export const FALLBACK_ORIENTATION =
  'Não consegui concluir a análise dos seus sintomas agora. Por segurança, procure ' +
  'atendimento em uma unidade de saúde. Se tiver falta de ar, dor no peito, desmaio ' +
  'ou piora rápida, ligue 192 para o SAMU imediatamente.';

/** Resultado seguro usado sempre que o modelo falha ou responde algo inválido. */
export function createFallbackResult(): SymptomResult {
  return {
    urgency: 'urgente',
    orientation: FALLBACK_ORIENTATION,
    recommendedCare: 'upa',
    warningSigns: ['falta de ar', 'dor no peito', 'desmaio', 'piora rápida dos sintomas'],
    source: 'fallback',
  };
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function includes<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

function optionalText(value: unknown, field: string): ParseResult<string | undefined> {
  if (value === undefined || value === null || value === '') return { ok: true, value: undefined };
  if (typeof value !== 'string') return { ok: false, error: `${field} deve ser texto` };
  const trimmed = value.trim();
  if (trimmed.length > MAX_TEXT_LENGTH) return { ok: false, error: `${field} muito longo` };
  return { ok: true, value: trimmed || undefined };
}

function parseSymptomList(value: unknown): ParseResult<string[]> {
  if (!Array.isArray(value)) return { ok: false, error: 'sintomas deve ser uma lista' };
  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  if (items.length === 0 || items.length !== value.length) {
    return { ok: false, error: 'sintomas deve conter textos não vazios' };
  }
  if (items.length > MAX_SYMPTOMS) return { ok: false, error: 'sintomas demais' };
  if (items.some((item) => item.length > MAX_SYMPTOM_LENGTH)) {
    return { ok: false, error: 'sintoma muito longo' };
  }
  return { ok: true, value: items };
}

/** Valida os argumentos recebidos da ferramenta `analisar_sintomas`. */
export function parseSymptomInput(raw: unknown): ParseResult<SymptomInput> {
  if (!isRecord(raw)) return { ok: false, error: 'corpo deve ser um objeto' };
  const sintomas = parseSymptomList(raw.sintomas);
  if (!sintomas.ok) return sintomas;
  const duracao = optionalText(raw.duracao, 'duracao');
  if (!duracao.ok) return duracao;
  const observacoes = optionalText(raw.observacoes, 'observacoes');
  if (!observacoes.ok) return observacoes;
  const intensidade = raw.intensidade;
  if (intensidade !== undefined && intensidade !== null && !includes(SYMPTOM_INTENSITIES, intensidade)) {
    return { ok: false, error: 'intensidade deve ser leve, moderada ou forte' };
  }
  const value: SymptomInput = { sintomas: sintomas.value };
  if (duracao.value) value.duracao = duracao.value;
  if (includes(SYMPTOM_INTENSITIES, intensidade)) value.intensidade = intensidade;
  if (observacoes.value) value.observacoes = observacoes.value;
  return { ok: true, value };
}

/** Regras de segurança aplicadas sobre a saída do modelo. */
function enforceSafety(urgency: UrgencyLevel, care: CareRecommendation): CareRecommendation {
  if (urgency === 'emergencia') return 'samu';
  if (urgency === 'urgente' && (care === 'autocuidado' || care === 'teleconsulta')) return 'upa';
  return care;
}

/**
 * Valida a saída do modelo de sintomas (objeto ou string JSON). Nunca lança:
 * qualquer resposta inválida vira o resultado seguro de `createFallbackResult`.
 */
export function parseSymptomResult(raw: unknown): SymptomResult {
  let data: unknown = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return createFallbackResult();
    }
  }
  if (!isRecord(data)) return createFallbackResult();
  const { urgency, orientation, recommendedCare, warningSigns } = data;
  if (!includes(URGENCY_LEVELS, urgency) || !includes(CARE_RECOMMENDATIONS, recommendedCare)) {
    return createFallbackResult();
  }
  if (typeof orientation !== 'string' || !orientation.trim()) return createFallbackResult();
  const signs = Array.isArray(warningSigns)
    ? warningSigns.filter((sign): sign is string => typeof sign === 'string' && sign.trim() !== '')
    : [];
  return {
    urgency,
    orientation: orientation.trim().slice(0, MAX_ORIENTATION_LENGTH),
    recommendedCare: enforceSafety(urgency, recommendedCare),
    warningSigns: signs.slice(0, MAX_WARNING_SIGNS),
    source: 'model',
  };
}
