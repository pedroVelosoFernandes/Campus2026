import type { Coordinates, HealthUnit } from '@/services/health-units/types';

/**
 * Unidades de saúde FICTÍCIAS para demonstração. Não são unidades reais:
 * nomes, endereços e telefones são ilustrativos. Substituir por dados oficiais
 * (CNES / Secretaria Municipal de Saúde) antes de qualquer uso real.
 */

/** Ponto de referência do bairro fictício usado nas demos. */
export const MOCK_USER_LOCATION: Coordinates = { latitude: -15.7939, longitude: -47.8828 };

export const MOCK_HEALTH_UNITS: HealthUnit[] = [
  {
    id: 'ubs-jardim-esperanca',
    name: 'UBS Jardim Esperança (exemplo)',
    type: 'UBS',
    address: 'Rua das Acácias, 120 — Jardim Esperança',
    coordinates: { latitude: -15.7975, longitude: -47.8862 },
    services: ['ubs', 'consulta_rotina', 'vacinacao'],
    hours: 'Seg a sex, 7h às 19h',
    phone: '(00) 0000-0001',
    howToAccess:
      'Leve documento com foto, cartão do SUS (ou CPF) e comprovante de endereço. ' +
      'Consultas de rotina são agendadas na recepção ou pelo app Meu SUS Digital.',
  },
  {
    id: 'ubs-vila-nova',
    name: 'UBS Vila Nova (exemplo)',
    type: 'UBS',
    address: 'Av. Central, 455 — Vila Nova',
    coordinates: { latitude: -15.781, longitude: -47.871 },
    services: ['ubs', 'consulta_rotina', 'vacinacao', 'farmacia_popular'],
    hours: 'Seg a sex, 7h às 17h; sáb, 8h às 12h (só vacinação)',
    phone: '(00) 0000-0002',
    howToAccess:
      'Sala de vacina por ordem de chegada. Leve documento com foto, cartão do SUS ' +
      'e a caderneta de vacinação, se tiver.',
  },
  {
    id: 'upa-24h-centro',
    name: 'UPA 24h Centro (exemplo)',
    type: 'UPA',
    address: 'Rua do Pronto Atendimento, 10 — Centro',
    coordinates: { latitude: -15.8005, longitude: -47.8901 },
    services: ['upa', 'pronto_socorro'],
    hours: '24 horas, todos os dias',
    phone: '(00) 0000-0003',
    howToAccess: 'Atendimento por classificação de risco, sem agendamento. Leve documento com foto.',
  },
  {
    id: 'hospital-regional',
    name: 'Hospital Regional (exemplo)',
    type: 'Hospital',
    address: 'Av. da Saúde, 1000 — Setor Hospitalar',
    coordinates: { latitude: -15.8301, longitude: -47.92 },
    services: ['pronto_socorro'],
    hours: 'Pronto-socorro 24 horas',
    howToAccess: 'Para casos graves. Em emergência, ligue 192 (SAMU).',
  },
  {
    id: 'caps-bem-viver',
    name: 'CAPS Bem Viver (exemplo)',
    type: 'CAPS',
    address: 'Rua da Esperança, 77 — Jardim Esperança',
    coordinates: { latitude: -15.7899, longitude: -47.8799 },
    services: ['saude_mental'],
    hours: 'Seg a sex, 8h às 18h',
    howToAccess: 'Acolhimento sem agendamento. Em crise, ligue 192 ou para o CVV no 188.',
  },
  {
    id: 'telessaude-municipal',
    name: 'Telessaúde da Secretaria Municipal (exemplo)',
    type: 'Serviço digital',
    address: null,
    coordinates: null,
    services: ['teleconsulta'],
    hours: 'Seg a sex, 8h às 20h',
    howToAccess:
      'Acesse pelo app Meu SUS Digital ou pelo site da Secretaria Municipal de Saúde. ' +
      'Tenha em mãos CPF ou cartão do SUS. A oferta varia de município para município.',
  },
];
