import type { HealthService } from '@/services/health-units/types';
import type { CareRecommendation } from '@/services/symptom-model/types';

import type { SuggestedAction, ToolResult, TranscriptMessage } from './types';

/** Regras puras que transformam o resultado de uma ferramenta em sugestão de tela. */

function fromCare(care: CareRecommendation): SuggestedAction {
  switch (care) {
    case 'samu':
      return { kind: 'cuidar-saude', emergency: true, label: 'Ligue 192 (SAMU) agora' };
    case 'upa':
      return { kind: 'cuidar-saude', label: 'Ver UPAs próximas' };
    case 'teleconsulta':
      return { kind: 'teleconsulta', label: 'Fazer uma teleconsulta' };
    case 'ubs':
      return { kind: 'cuidar-saude', label: 'Ver UBS próximas' };
    default:
      return { kind: 'cuidar-saude', label: 'Ver cuidados em casa' };
  }
}

function fromService(service: HealthService): SuggestedAction {
  switch (service) {
    case 'vacinacao':
      return { kind: 'vacinacao', label: 'Ver locais de vacinação' };
    case 'teleconsulta':
      return { kind: 'teleconsulta', label: 'Fazer uma teleconsulta' };
    case 'upa':
    case 'pronto_socorro':
      return { kind: 'cuidar-saude', label: 'Ver unidades de urgência próximas' };
    default:
      return { kind: 'cuidar-saude', label: 'Ver unidades próximas' };
  }
}

export function suggestActionFor(tool: ToolResult): SuggestedAction {
  return tool.tool === 'registrar_orientacao_sintomas' ? fromCare(tool.result.recommendedCare) : fromService(tool.result.servico);
}

/**
 * Combina a sugestão atual com a nova. Uma emergência nunca é substituída
 * por algo menos urgente na mesma conversa.
 */
export function mergeSuggestedAction(current: SuggestedAction | null, next: SuggestedAction): SuggestedAction {
  if (current?.emergency && !next.emergency) return current;
  return next;
}

/** Ao encerrar sem nenhuma sugestão, oferece rever a conversa no histórico. */
export function suggestionOnStop(
  current: SuggestedAction | null,
  transcript: TranscriptMessage[],
): SuggestedAction | null {
  if (current || transcript.length === 0) return current;
  return { kind: 'conversas', label: 'Ver a conversa' };
}
