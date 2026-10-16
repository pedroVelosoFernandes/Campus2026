import { HEALTH_SERVICES } from '@/services/health-units/types';
import { SYMPTOM_RESULT_SCHEMA } from '@/services/symptom-model/prompt';

/**
 * Ferramentas (function tools da Responses API) registradas no backend de
 * delegação do GPT-Live e no modo texto. Ambas são EXECUTADAS PELO APP:
 * o backend pede, o app executa e devolve `function_call_output`.
 */

export const SYMPTOM_TOOL_NAME = 'registrar_orientacao_sintomas';
export const UNITS_TOOL_NAME = 'buscar_unidades';
export type ToolName = typeof SYMPTOM_TOOL_NAME | typeof UNITS_TOOL_NAME;

export function isKnownTool(name: string): name is ToolName {
  return name === SYMPTOM_TOOL_NAME || name === UNITS_TOOL_NAME;
}

/**
 * Caso 2 (sintomas): o modelo de sintomas (backend de delegação, hoje GPT-Sol)
 * registra sua avaliação estruturada. O app valida, aplica as regras de
 * segurança e devolve o resultado final, que deve ser usado na resposta.
 */
export const SYMPTOM_TOOL = {
  type: 'function',
  name: SYMPTOM_TOOL_NAME,
  description:
    'Use SOMENTE quando a pessoa relatar sintomas, ANTES de responder sobre eles. Registra sua ' +
    'avaliação: nível de urgência, orientação curta em português simples, tipo de atendimento ' +
    'recomendado e sinais de alerta. A resposta da ferramenta traz o resultado validado pelo app ' +
    '(pode ter urgência ajustada por segurança): baseie sua resposta nele.',
  parameters: SYMPTOM_RESULT_SCHEMA,
  strict: true,
} as const;

/** Casos 1, 3, 4 e 5: busca local (sem LLM) de unidades pelo serviço necessário. */
export const UNITS_TOOL = {
  type: 'function',
  name: UNITS_TOOL_NAME,
  description:
    'Busca unidades ou serviços do SUS adequados à necessidade da pessoa (vacinação, consulta ' +
    'de rotina na UBS, UPA, teleconsulta, saúde mental, Farmácia Popular). Filtra primeiro pelo ' +
    'serviço e depois pela proximidade. Retorna nome, tipo, endereço, distância, horário, como ' +
    'acessar e um aviso sobre a confiabilidade dos dados.',
  parameters: {
    type: 'object',
    properties: {
      servico: { type: 'string', enum: [...HEALTH_SERVICES], description: 'Serviço de que a pessoa precisa.' },
      localizacao: { type: 'string', description: 'Bairro, cidade ou referência dita pela pessoa, se houver.' },
    },
    required: ['servico'],
    additionalProperties: false,
  },
  strict: false,
} as const;

export const APP_TOOLS = [SYMPTOM_TOOL, UNITS_TOOL] as const;
