import { createRemoteUnitFinder } from '@/services/health-units/remote-finder';
import type { Coordinates, HealthUnitFinder } from '@/services/health-units/types';

import { authFetch } from './auth-fetch';
import { createAssistantLocation, type AssistantLocation } from './assistant-location';

/**
 * Escolhe a base de unidades do app:
 * - `oficial`: CNES via nosso servidor (`/api/health-units`), quando há backend configurado;
 * - `exemplo`: dados fictícios locais (demo, testes, sem backend).
 * `EXPO_PUBLIC_UNITS_SOURCE=exemplo` força os dados de exemplo mesmo com backend.
 */

export type UnitSource = 'oficial' | 'exemplo';

export interface UnitsEnv {
  apiUrl?: string;
  source?: string;
}

export function readUnitsEnv(): UnitsEnv {
  return { apiUrl: process.env.EXPO_PUBLIC_API_URL, source: process.env.EXPO_PUBLIC_UNITS_SOURCE };
}

export function resolveUnitSource(env: UnitsEnv = readUnitsEnv()): UnitSource {
  if (env.source?.trim().toLowerCase() === 'exemplo') return 'exemplo';
  return env.apiUrl?.trim() ? 'oficial' : 'exemplo';
}

export interface OfficialUnitDeps {
  unitFinder: HealthUnitFinder;
  getCoordinates: () => Promise<Coordinates | null>;
}

/** Finder oficial + localização real do aparelho para o assistente (voz e texto). */
export function createOfficialUnitDeps(
  apiUrl: string,
  location: AssistantLocation = createAssistantLocation(),
): OfficialUnitDeps {
  return {
    unitFinder: createRemoteUnitFinder({ apiUrl, fetchImpl: authFetch, resolvePlace: location.resolvePlace }),
    getCoordinates: location.getCoordinates,
  };
}
