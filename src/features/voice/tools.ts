import { HEALTH_SERVICES } from '@/services/health-units/types';
import { SYMPTOM_INTENSITIES } from '@/services/symptom-model/types';

/** Ferramentas (function calling) disponíveis para o GPT Live. */

export const SYMPTOM_TOOL_NAME = 'analisar_sintomas';
export const UNITS_TOOL_NAME = 'buscar_unidades';
export type ToolName = typeof SYMPTOM_TOOL_NAME | typeof UNITS_TOOL_NAME;

export function isKnownTool(name: string): name is ToolName {
  return name === SYMPTOM_TOOL_NAME || name === UNITS_TOOL_NAME;
}

/** Caso 2 (sintomas): chama o modelo de sintomas (hoje GPT-Sol) no servidor. */
export const SYMPTOM_TOOL = {
  type: 'function',
  name: SYMPTOM_TOOL_NAME,
  description:
    'Use SOMENTE quando a pessoa relatar sintomas de saúde. Envia os sintomas ao modelo ' +
    'especializado, que retorna o nível de urgência, uma orientação curta e o tipo de ' +
    'atendimento recomendado (samu, upa, ubs, teleconsulta ou autocuidado).',
  parameters: {
    type: 'object',
    properties: {
      sintomas: {
        type: 'array',
        items: { type: 'string' },
        description: 'Sintomas relatados, em linguagem padrão, ex.: ["febre", "dor de cabeça"].',
      },
      duracao: { type: 'string', description: 'Há quanto tempo os sintomas começaram, ex.: "2 dias".' },
      intensidade: { type: 'string', enum: [...SYMPTOM_INTENSITIES] },
      observacoes: {
        type: 'string',
        description: 'Outras informações relevantes: idade, gestação, doenças crônicas, medicamentos.',
      },
    },
    required: ['sintomas'],
  },
} as const;

/** Casos 1, 3, 4 e 5: busca local (sem LLM) de unidades pelo serviço necessário. */
export const UNITS_TOOL = {
  type: 'function',
  name: UNITS_TOOL_NAME,
  description:
    'Busca unidades ou serviços do SUS adequados à necessidade da pessoa (vacinação, consulta ' +
    'de rotina na UBS, UPA, teleconsulta, saúde mental, Farmácia Popular). Filtra primeiro pelo ' +
    'serviço e depois pela proximidade. Retorna nome, tipo, endereço, distância, horário e como acessar.',
  parameters: {
    type: 'object',
    properties: {
      servico: { type: 'string', enum: [...HEALTH_SERVICES], description: 'Serviço de que a pessoa precisa.' },
      localizacao: {
        type: 'string',
        description: 'Bairro, cidade ou referência dita pela pessoa, se houver.',
      },
    },
    required: ['servico'],
  },
} as const;

export const REALTIME_TOOLS = [SYMPTOM_TOOL, UNITS_TOOL] as const;
