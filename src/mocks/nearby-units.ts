import type { HealthUnit } from '@/services/health-units/types';

import { MOCK_HEALTH_UNITS } from './health-units';

/**
 * Unidades FICTÍCIAS mostradas no mapa "Onde buscar atendimento". A primeira é a
 * UBS genérica de referência do bairro de demonstração (a mais próxima de
 * `MOCK_USER_LOCATION`, a ~200 m); as demais reaproveitam `MOCK_HEALTH_UNITS`.
 */
export const NEIGHBORHOOD_UBS: HealthUnit = {
  id: 'ubs-do-seu-bairro',
  name: 'UBS do seu bairro',
  type: 'UBS',
  address: 'Rua Principal, 200 — Centro do bairro',
  coordinates: { latitude: -15.7955, longitude: -47.884 },
  services: ['vacinacao', 'ubs', 'consulta_rotina'],
  hours: 'Seg a sex, 7h às 18h',
  howToAccess:
    'Leve documento com foto, cartão do SUS e a caderneta de vacinação. ' +
    'Consultas de rotina são agendadas na recepção.',
};

export const MOCK_NEARBY_UNITS: HealthUnit[] = [NEIGHBORHOOD_UBS, ...MOCK_HEALTH_UNITS];
