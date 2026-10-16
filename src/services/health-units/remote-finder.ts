import { defaultFetch, type FetchLike } from './http';
import { OFFICIAL_CHANNELS_NOTICE } from './local-finder';
import {
  HEALTH_SERVICES,
  type Coordinates,
  type HealthUnitFinder,
  type PlaceHint,
  type UnitMatch,
  type UnitSearchQuery,
  type UnitSearchResult,
} from './types';

/**
 * Finder do APP: pede as unidades oficiais (CNES) ao NOSSO servidor
 * (`POST /api/health-units`). As coordenadas vão no corpo (nunca na URL, que
 * costuma ir para logs). Nunca lança: falhas viram aviso + canais oficiais.
 */

export const REMOTE_UNITS_TIMEOUT_MS = 15_000;

export interface RemoteFinderOptions {
  apiUrl: string;
  /** No app, o `apiFetch` autenticado (anexa o token de sessão). */
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  /** Cidade/UF a partir das coordenadas (geocodificação reversa no aparelho) ou a cidade digitada. */
  resolvePlace?: (coordinates: Coordinates | null) => Promise<PlaceHint | null>;
}

export function remoteFailure(query: UnitSearchQuery): UnitSearchResult {
  return {
    servico: query.servico,
    units: [],
    usedLocation: false,
    notice: `Não consegui consultar a base oficial de unidades agora. ${OFFICIAL_CHANNELS_NOTICE}`,
    dataSource: 'cnes',
  };
}

const isString = (value: unknown): value is string => typeof value === 'string';

function isUnit(value: unknown): value is UnitMatch {
  const unit = value as Partial<UnitMatch> | null;
  return (
    !!unit &&
    isString(unit.id) &&
    isString(unit.name) &&
    isString(unit.type) &&
    isString(unit.hours) &&
    isString(unit.howToAccess) &&
    Array.isArray(unit.services) &&
    (unit.distanceKm === null || typeof unit.distanceKm === 'number')
  );
}

/** Valida a resposta do servidor; `null` se o formato não bate. */
export function parseUnitSearchResult(data: unknown): UnitSearchResult | null {
  const raw = data as Partial<UnitSearchResult> | null;
  if (!raw || !isString(raw.notice) || !Array.isArray(raw.units)) return null;
  if (!isString(raw.servico) || !(HEALTH_SERVICES as readonly string[]).includes(raw.servico)) return null;
  return {
    servico: raw.servico,
    units: raw.units.filter(isUnit),
    usedLocation: raw.usedLocation === true,
    notice: raw.notice,
    dataSource: raw.dataSource === 'cnes' ? 'cnes' : 'exemplo',
  };
}

export function createRemoteUnitFinder(options: RemoteFinderOptions): HealthUnitFinder {
  const fetchImpl = options.fetchImpl ?? defaultFetch;
  const url = `${options.apiUrl.replace(/\/+$/, '')}/api/health-units`;

  return {
    async find(query) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? REMOTE_UNITS_TIMEOUT_MS);
      try {
        const coordinates = query.coordinates ?? null;
        const place = query.place ?? (await options.resolvePlace?.(coordinates).catch(() => null)) ?? null;
        const response = await fetchImpl(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ servico: query.servico, localizacao: query.localizacao, coordinates, place }),
          signal: controller.signal,
        });
        if (!response.ok) return remoteFailure(query);
        return parseUnitSearchResult(await response.json()) ?? remoteFailure(query);
      } catch {
        return remoteFailure(query);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
