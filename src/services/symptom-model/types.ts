/**
 * Contratos do modelo de análise de sintomas.
 *
 * O modelo especializado treinado para o Alô Saúde ainda não existe; por
 * enquanto ele é substituído pelo GPT-Sol (ver `gpt-sol-analyzer.ts`). Qualquer
 * implementação futura só precisa satisfazer a interface `SymptomAnalyzer`.
 */

export const URGENCY_LEVELS = ['emergencia', 'urgente', 'pouco_urgente', 'nao_urgente'] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

export const CARE_RECOMMENDATIONS = ['samu', 'upa', 'ubs', 'teleconsulta', 'autocuidado'] as const;
export type CareRecommendation = (typeof CARE_RECOMMENDATIONS)[number];

export const SYMPTOM_INTENSITIES = ['leve', 'moderada', 'forte'] as const;
export type SymptomIntensity = (typeof SYMPTOM_INTENSITIES)[number];

/** Argumentos da ferramenta `analisar_sintomas` chamada pelo GPT Live. */
export interface SymptomInput {
  sintomas: string[];
  duracao?: string;
  intensidade?: SymptomIntensity;
  observacoes?: string;
}

export interface SymptomResult {
  urgency: UrgencyLevel;
  /** Orientação curta, em português, para ser falada ao usuário. */
  orientation: string;
  recommendedCare: CareRecommendation;
  /** Sinais de alerta que, se surgirem, exigem atendimento imediato. */
  warningSigns: string[];
  /** `fallback` quando a resposta do modelo foi inválida ou indisponível. */
  source: 'model' | 'fallback';
}

export interface SymptomAnalyzer {
  analyze(input: SymptomInput, options?: { signal?: AbortSignal }): Promise<SymptomResult>;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
