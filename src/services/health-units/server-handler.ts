import type { RequestGuard } from '@/services/server/request-guard';

import { createCnesUnitFinder } from './cnes/finder';
import { parseUnitSearchInput, type ParseResult } from './local-finder';
import type { Coordinates, HealthUnitFinder, PlaceHint, UnitSearchQuery } from './types';

/**
 * Handler da rota `POST /api/health-units`. Corpo:
 * `{ servico, localizacao?, coordinates?: {latitude, longitude}, place?: {city, uf, ibgeCode} }`.
 * Não registra coordenadas nem cidade em log (LGPD: minimização).
 */

export interface HealthUnitsDeps {
  guard?: RequestGuard;
  finder?: HealthUnitFinder;
}

function parseCoordinates(value: unknown): Coordinates | null {
  const raw = value as Partial<Coordinates> | null;
  const { latitude, longitude } = raw ?? {};
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

const shortText = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined;

function parsePlace(value: unknown): PlaceHint | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const place: PlaceHint = { city: shortText(raw.city, 80), uf: shortText(raw.uf, 40), ibgeCode: shortText(raw.ibgeCode, 7) };
  return place.city || place.ibgeCode ? place : null;
}

export function parseUnitsRequest(body: unknown): ParseResult<UnitSearchQuery> {
  const input = parseUnitSearchInput(body);
  if (!input.ok) return input;
  const raw = body as Record<string, unknown>;
  return {
    ok: true,
    value: { ...input.value, coordinates: parseCoordinates(raw.coordinates), place: parsePlace(raw.place) },
  };
}

let sharedFinder: HealthUnitFinder | null = null;
/** Um finder por processo, para o cache do CNES/IBGE valer entre requisições. */
export function getSharedCnesFinder(): HealthUnitFinder {
  sharedFinder ??= createCnesUnitFinder();
  return sharedFinder;
}

export async function handleHealthUnits(request: Request, deps: HealthUnitsDeps = {}): Promise<Response> {
  const blocked = await deps.guard?.(request);
  if (blocked) return blocked;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const query = parseUnitsRequest(body);
  if (!query.ok) return Response.json({ error: query.error }, { status: 400 });
  const finder = deps.finder ?? getSharedCnesFinder();
  const result = await finder.find(query.value);
  // Resposta derivada da localização da pessoa: não deve ficar em caches intermediários.
  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
