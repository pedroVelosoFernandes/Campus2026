/**
 * Busca de unidades de saúde. Duas implementações de `HealthUnitFinder`:
 * - dados de exemplo locais (`src/mocks/health-units.ts`), para demo e testes;
 * - CNES (dados abertos do Ministério da Saúde), consultado pelo NOSSO servidor
 *   na rota `/api/health-units` (ver `cnes/` e `remote-finder.ts`).
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

export type HealthUnitType =
  | 'UBS'
  | 'UPA'
  | 'Hospital'
  | 'CAPS'
  | 'Centro de imunização'
  | 'Farmácia Popular'
  | 'Serviço digital';

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

/** Município da pessoa (do GPS via geocodificação reversa ou digitado). */
export interface PlaceHint {
  city?: string;
  /** Sigla da UF (ex.: "DF") ou nome do estado. */
  uf?: string;
  /** Código IBGE do município (6 ou 7 dígitos), quando já conhecido. */
  ibgeCode?: string;
}

export interface UnitSearchQuery extends UnitSearchInput {
  /** Coordenadas do aparelho, quando o usuário permitiu a localização. */
  coordinates?: Coordinates | null;
  /** Município, quando conhecido; a base oficial é consultada por município. */
  place?: PlaceHint | null;
}

export interface UnitMatch extends Omit<HealthUnit, 'coordinates'> {
  /** Ponto da unidade, para o mapa e o "Como chegar" (ausente/`null` se desconhecido). */
  coordinates?: Coordinates | null;
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
  /** Origem dos dados: base oficial (CNES) ou exemplos fictícios. Ausente = exemplo. */
  dataSource?: 'cnes' | 'exemplo';
}

export interface HealthUnitFinder {
  find(query: UnitSearchQuery): Promise<UnitSearchResult>;
}
