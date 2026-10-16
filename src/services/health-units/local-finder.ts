import {
  HEALTH_SERVICES,
  type Coordinates,
  type HealthService,
  type HealthUnit,
  type HealthUnitFinder,
  type UnitMatch,
  type UnitSearchInput,
  type UnitSearchQuery,
  type UnitSearchResult,
} from './types';

export const MAX_UNITS_RESULT = 3;

export const OFFICIAL_CHANNELS_NOTICE =
  'Horários e serviços podem mudar. Confirme pelo Disque Saúde 136, pelo app Meu SUS Digital ' +
  'ou na Secretaria Municipal de Saúde antes de ir.';

/** Serviços que também atendem a necessidade pedida (ex.: consulta de rotina é na UBS). */
const EQUIVALENT_SERVICES: Partial<Record<HealthService, HealthService[]>> = {
  consulta_rotina: ['consulta_rotina', 'ubs'],
  ubs: ['ubs', 'consulta_rotina'],
  pronto_socorro: ['pronto_socorro', 'upa'],
};

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Valida os argumentos da ferramenta `buscar_unidades`. */
export function parseUnitSearchInput(raw: unknown): ParseResult<UnitSearchInput> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'argumentos devem ser um objeto' };
  }
  const { servico, localizacao } = raw as Record<string, unknown>;
  if (typeof servico !== 'string' || !(HEALTH_SERVICES as readonly string[]).includes(servico)) {
    return { ok: false, error: `servico deve ser um de: ${HEALTH_SERVICES.join(', ')}` };
  }
  const value: UnitSearchInput = { servico: servico as HealthService };
  if (typeof localizacao === 'string' && localizacao.trim()) value.localizacao = localizacao.trim().slice(0, 200);
  return { ok: true, value };
}

/** Distância em km pela fórmula de haversine. */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function toMatch(unit: HealthUnit, origin: Coordinates | null): UnitMatch {
  const { coordinates, ...rest } = unit;
  const distance = origin && coordinates ? Math.round(distanceKm(origin, coordinates) * 10) / 10 : null;
  return { ...rest, distanceKm: distance };
}

/**
 * Filtra pelo SERVIÇO necessário primeiro e só depois ordena por proximidade:
 * a unidade mais perto não serve se não oferece o que a pessoa precisa.
 */
export function searchUnits(units: HealthUnit[], query: UnitSearchQuery): UnitSearchResult {
  const accepted = new Set(EQUIVALENT_SERVICES[query.servico] ?? [query.servico]);
  const origin = query.coordinates ?? null;
  const matches = units
    .filter((unit) => unit.services.some((service) => accepted.has(service)))
    .map((unit) => ({ match: toMatch(unit, origin), exact: unit.services.includes(query.servico) }))
    .sort((a, b) => {
      if (a.exact !== b.exact) return a.exact ? -1 : 1;
      return (a.match.distanceKm ?? Infinity) - (b.match.distanceKm ?? Infinity);
    })
    .slice(0, MAX_UNITS_RESULT)
    .map(({ match }) => match);

  const parts = [OFFICIAL_CHANNELS_NOTICE];
  if (!origin) {
    parts.unshift('Não tenho sua localização exata, então as distâncias não foram calculadas.');
  }
  if (matches.length === 0) {
    parts.unshift('Não encontrei unidades com esse serviço nos dados disponíveis.');
  }
  return { servico: query.servico, units: matches, usedLocation: origin !== null, notice: parts.join(' ') };
}

export function createLocalUnitFinder(units: HealthUnit[]): HealthUnitFinder {
  return { find: async (query) => searchUnits(units, query) };
}
