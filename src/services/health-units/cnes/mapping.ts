import type { HealthService, HealthUnitType } from '../types';

/**
 * Tipos de estabelecimento do CNES (`GET /cnes/tipounidades`) que atendem cada
 * serviço do app. O CNES não informa quais vacinas há em estoque: as salas de
 * vacina ficam nas UBS/postos, então para vacinação usamos UBS + centros de
 * imunização e pedimos para confirmar a disponibilidade.
 */
export const CNES_TYPE = {
  POSTO_DE_SAUDE: 1,
  CENTRO_DE_SAUDE_UBS: 2,
  HOSPITAL_GERAL: 5,
  HOSPITAL_ESPECIALIZADO: 7,
  UNIDADE_MISTA: 15,
  PRONTO_SOCORRO_GERAL: 20,
  PRONTO_SOCORRO_ESPECIALIZADO: 21,
  CAPS: 70,
  PRONTO_ATENDIMENTO_UPA: 73,
  CENTRO_DE_IMUNIZACAO: 85,
} as const;

interface TypeProfile {
  type: HealthUnitType;
  services: HealthService[];
  howToAccess: string;
  /** Tipos públicos por natureza dispensam o filtro "atende SUS". */
  alwaysPublic?: boolean;
  /**
   * Aceita sem a marcação "atende SUS" quando o nome indica serviço público
   * (há UBS cadastradas sem a marcação; e clínicas privadas cadastradas como "centro de saúde").
   */
  publicName?: RegExp;
}

const PRIMARY_CARE: TypeProfile = {
  type: 'UBS',
  services: ['ubs', 'consulta_rotina', 'vacinacao'],
  howToAccess:
    'Leve documento com foto, Cartão SUS (ou CPF) e comprovante de endereço. ' +
    'Consultas de rotina são agendadas na recepção da UBS de referência do seu endereço. ' +
    'Para vacinas, leve a caderneta e confirme a disponibilidade antes de ir.',
  publicName: /\b(UBS|UBSF|USF|ESF|PSF|UNIDADE BASICA|POSTO DE SAUDE|CENTRO DE SAUDE|CLINICA DA FAMILIA)\b/i,
};

const EMERGENCY_ACCESS =
  'Atendimento de urgência por classificação de risco, sem agendamento. Em emergência grave, ligue 192 (SAMU).';

export const CNES_TYPE_PROFILES: Record<number, TypeProfile> = {
  [CNES_TYPE.POSTO_DE_SAUDE]: PRIMARY_CARE,
  [CNES_TYPE.CENTRO_DE_SAUDE_UBS]: PRIMARY_CARE,
  [CNES_TYPE.UNIDADE_MISTA]: { ...PRIMARY_CARE, services: ['ubs', 'consulta_rotina', 'vacinacao', 'pronto_socorro'] },
  [CNES_TYPE.CENTRO_DE_IMUNIZACAO]: {
    type: 'Centro de imunização',
    services: ['vacinacao'],
    howToAccess: 'Leve documento com foto e a caderneta de vacinação. Confirme a disponibilidade da vacina antes de ir.',
  },
  [CNES_TYPE.PRONTO_ATENDIMENTO_UPA]: {
    type: 'UPA',
    services: ['upa', 'pronto_socorro'],
    howToAccess: EMERGENCY_ACCESS,
    alwaysPublic: true,
  },
  [CNES_TYPE.PRONTO_SOCORRO_GERAL]: { type: 'Hospital', services: ['pronto_socorro'], howToAccess: EMERGENCY_ACCESS },
  [CNES_TYPE.PRONTO_SOCORRO_ESPECIALIZADO]: {
    type: 'Hospital',
    services: ['pronto_socorro'],
    howToAccess: EMERGENCY_ACCESS,
  },
  [CNES_TYPE.HOSPITAL_GERAL]: {
    type: 'Hospital',
    services: ['pronto_socorro'],
    howToAccess: 'Confirme se o hospital tem pronto-socorro aberto ao público. Em emergência grave, ligue 192 (SAMU).',
  },
  [CNES_TYPE.CAPS]: {
    type: 'CAPS',
    services: ['saude_mental'],
    howToAccess:
      'Acolhimento em saúde mental, geralmente sem encaminhamento. Leve documento com foto e Cartão SUS. ' +
      'Em crise, ligue 188 (CVV) ou 192 (SAMU).',
    alwaysPublic: true,
  },
};

/** Tipos consultados para cada serviço (o filtro final por serviço é do `searchUnits`). */
export const CNES_TYPES_BY_SERVICE: Record<HealthService, number[]> = {
  vacinacao: [CNES_TYPE.CENTRO_DE_SAUDE_UBS, CNES_TYPE.POSTO_DE_SAUDE, CNES_TYPE.CENTRO_DE_IMUNIZACAO],
  ubs: [CNES_TYPE.CENTRO_DE_SAUDE_UBS, CNES_TYPE.POSTO_DE_SAUDE],
  consulta_rotina: [CNES_TYPE.CENTRO_DE_SAUDE_UBS, CNES_TYPE.POSTO_DE_SAUDE],
  upa: [CNES_TYPE.PRONTO_ATENDIMENTO_UPA],
  pronto_socorro: [CNES_TYPE.PRONTO_ATENDIMENTO_UPA, CNES_TYPE.PRONTO_SOCORRO_GERAL, CNES_TYPE.HOSPITAL_GERAL],
  saude_mental: [CNES_TYPE.CAPS],
  // Serviços sem endereço próprio no CNES: respondemos com o canal oficial.
  teleconsulta: [],
  farmacia_popular: [],
};

/** Orientação quando o serviço não é localizável pelo CNES. */
export const NON_CNES_GUIDANCE: Partial<Record<HealthService, string>> = {
  teleconsulta:
    'Teleconsulta não tem endereço físico no CNES. Veja as opções pelo app Meu SUS Digital ' +
    'ou pergunte na sua UBS se o município oferece teleatendimento.',
  farmacia_popular:
    'As farmácias credenciadas no Farmácia Popular não constam no CNES. Consulte a lista oficial em ' +
    'gov.br/saude (Farmácia Popular) ou pelo Disque Saúde 136.',
};
