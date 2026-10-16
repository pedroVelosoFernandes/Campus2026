import * as ExpoLocation from 'expo-location';

import { placeFromText, toUf } from '@/services/health-units/ibge';

import type { Coordinates, LocationFix, LocationPermission, PlaceHint } from './types';

/**
 * Localização do aparelho só em primeiro plano (`whenInUse`), pedida no momento
 * em que a pessoa procura uma unidade. Nunca lança: sem permissão, sem GPS ou
 * sem sinal, devolve `null` e o app segue com a cidade informada ou um aviso.
 * A posição não é salva nem enviada a terceiros; ao nosso servidor vão só as
 * coordenadas e a cidade da busca (ver docs/producao.md, LGPD).
 */

export const LOCATION_TIMEOUT_MS = 8_000;
/** Última posição conhecida aceita como reserva (10 min). */
export const LAST_KNOWN_MAX_AGE_MS = 10 * 60 * 1000;

export type LocationApi = Pick<
  typeof ExpoLocation,
  | 'getForegroundPermissionsAsync'
  | 'requestForegroundPermissionsAsync'
  | 'getCurrentPositionAsync'
  | 'getLastKnownPositionAsync'
  | 'reverseGeocodeAsync'
  | 'geocodeAsync'
>;

function toPermission(status: string | undefined): LocationPermission {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => (clearTimeout(timer), resolve(value)),
      () => (clearTimeout(timer), resolve(null)),
    );
  });
}

const pick = (coords: { latitude: number; longitude: number }): Coordinates => ({
  latitude: coords.latitude,
  longitude: coords.longitude,
});

export interface LocationService {
  getPermission(): Promise<LocationPermission>;
  requestPermission(): Promise<LocationPermission>;
  /** Posição atual (com limite de tempo) ou a última conhecida recente; `null` sem permissão. */
  locate(): Promise<LocationFix | null>;
  /** Cidade e UF das coordenadas (no aparelho, sem servidor). */
  reversePlace(coordinates: Coordinates): Promise<PlaceHint | null>;
  /** "Campinas, SP" → ponto aproximado da cidade. */
  fromCityText(text: string): Promise<LocationFix | null>;
}

export function createLocationService(
  api: LocationApi = ExpoLocation,
  timeoutMs: number = LOCATION_TIMEOUT_MS,
): LocationService {
  async function getPermission() {
    const response = await api.getForegroundPermissionsAsync().catch(() => null);
    return toPermission(response?.status);
  }

  async function reversePlace(coordinates: Coordinates): Promise<PlaceHint | null> {
    const results = await withTimeout(api.reverseGeocodeAsync(coordinates), timeoutMs);
    const first = results?.[0];
    if (!first || (first.isoCountryCode && first.isoCountryCode !== 'BR')) return null;
    const city = first.city ?? first.subregion ?? undefined;
    const uf = toUf(first.region) ?? undefined;
    return city ? { city, uf } : null;
  }

  async function locate(): Promise<LocationFix | null> {
    if ((await getPermission()) !== 'granted') return null;
    const current = await withTimeout(
      api.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced }),
      timeoutMs,
    );
    if (current) {
      const coordinates = pick(current.coords);
      return { coordinates, approximate: false, source: 'gps', place: await reversePlace(coordinates) };
    }
    const last = await api.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS }).catch(() => null);
    if (!last) return null;
    const coordinates = pick(last.coords);
    return { coordinates, approximate: true, source: 'ultima-conhecida', place: await reversePlace(coordinates) };
  }

  return {
    getPermission,
    async requestPermission() {
      const response = await api.requestForegroundPermissionsAsync().catch(() => null);
      return toPermission(response?.status);
    },
    locate,
    reversePlace,
    async fromCityText(text) {
      const place = placeFromText(text) ?? (text.trim() ? { city: text.trim() } : null);
      if (!place?.city) return null;
      const query = [place.city, place.uf, 'Brasil'].filter(Boolean).join(', ');
      const found = await withTimeout(api.geocodeAsync(query), timeoutMs);
      const coordinates = found?.[0] ? pick(found[0]) : null;
      return { coordinates, approximate: true, source: 'cidade-informada', place };
    },
  };
}

export const locationService = createLocationService();
