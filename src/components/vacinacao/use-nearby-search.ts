import { useMemo } from 'react';

import { authFetch } from '@/features/location/auth-fetch';
import { useDeviceLocation, type DeviceLocationState } from '@/features/location/use-device-location';
import { readUnitsEnv, resolveUnitSource, type UnitSource } from '@/features/location/unit-finder';
import { createRemoteUnitFinder, type HealthService, type HealthUnitFinder } from '@/services/health-units';

import { defaultFinder, demoSearch, useNearbyUnits, type NearbySearch, type NearbyUnitsState } from './nearby-units';

/** O que o cartão sobre o mapa mostra. */
export type CardMode = 'ask' | 'city' | 'loading' | 'empty' | 'unit';

export type NearbySearchModel = NearbyUnitsState & {
  location: DeviceLocationState;
  source: UnitSource;
  search: NearbySearch | null;
  card: CardMode;
};

function searchFor(source: UnitSource, location: DeviceLocationState): NearbySearch | null {
  const { status, fix } = location;
  if (status === 'checking' || status === 'locating' || status === 'ask') return null;
  if (source === 'exemplo') return demoSearch(fix);
  if (!fix) return null;
  return { coordinates: fix.coordinates, place: fix.place, approximate: fix.approximate };
}

function cardFor(source: UnitSource, location: DeviceLocationState, units: NearbyUnitsState): CardMode {
  if (location.status === 'ask') return 'ask';
  if (source === 'oficial' && location.status === 'manual') return 'city';
  if (units.loading) return 'loading';
  return units.units.length > 0 ? 'unit' : 'empty';
}

/**
 * Junta localização + base de unidades da tela "Onde buscar atendimento".
 * Oficial (CNES pelo nosso servidor) quando há backend; senão, dados de exemplo.
 */
export function useNearbySearch(servico: HealthService, finderOverride?: HealthUnitFinder): NearbySearchModel {
  const location = useDeviceLocation();
  const source = finderOverride ? 'oficial' : resolveUnitSource();
  const finder = useMemo(() => {
    if (finderOverride) return finderOverride;
    const apiUrl = readUnitsEnv().apiUrl?.trim();
    return source === 'oficial' && apiUrl ? createRemoteUnitFinder({ apiUrl, fetchImpl: authFetch }) : defaultFinder;
  }, [finderOverride, source]);
  const search = searchFor(source, location);
  const units = useNearbyUnits(servico, search, finder);
  return { ...units, location, source, search, card: cardFor(source, location, units) };
}
