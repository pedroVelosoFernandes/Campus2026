/**
 * Busca de unidades de saúde. Hoje os dados vêm de mocks locais
 * (`src/mocks/health-units.ts`); no futuro podem vir do CNES / dados abertos
 * do município, bastando outra implementação de `HealthUnitFinder`.
 */

export const HEALTH_SERVICES = [
  'vacinacao',
  'ubs',
  'consulta_rotina',
  'upa',
  'pronto_socorro',
  'teleconsulta',
  'saude_mental',
  'farmacia_popular',
] as const;
export type HealthService = (typeof HEALTH_SERVICES)[number];

export type HealthUnitType = 'UBS' | 'UPA' | 'Hospital' | 'CAPS' | 'Farmácia Popular' | 'Serviço digital';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface HealthUnit {
  id: string;
  name: string;
  type: HealthUnitType;
  /** Endereço físico; `null` para serviços 100% remotos. */
  address: string | null;
  coordinates: Coordinates | null;
  services: HealthService[];
  hours: string;
  phone?: string;
  /** Como acessar (agendamento, documentos, link/app oficial). */
  howToAccess: string;
}

export interface UnitSearchInput {
  servico: HealthService;
  /** Texto livre dito pelo usuário (bairro, cidade, referência). */
  localizacao?: string;
}

export interface UnitSearchQuery extends UnitSearchInput {
  /** Coordenadas do aparelho, quando o usuário permitiu a localização. */
  coordinates?: Coordinates | null;
}

export interface UnitMatch extends Omit<HealthUnit, 'coordinates'> {
  /** Distância em km; `null` quando não há localização ou é serviço remoto. */
  distanceKm: number | null;
}

export interface UnitSearchResult {
  servico: HealthService;
  units: UnitMatch[];
  /** Se a busca usou a localização real do usuário. */
  usedLocation: boolean;
  /** Limitações a serem explicadas ao usuário (dados simulados, confirmar no canal oficial). */
  notice: string;
}

export interface HealthUnitFinder {
  find(query: UnitSearchQuery): Promise<UnitSearchResult>;
}
