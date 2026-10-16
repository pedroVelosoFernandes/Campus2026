import { locationService, type LocationService } from './location-service';
import { getManualFix } from './manual-place';
import type { Coordinates, PlaceHint } from './types';

/**
 * Funções injetadas no assistente (voz e texto) para a ferramenta
 * `buscar_unidades`. A pessoa acabou de pedir uma unidade próxima, então é o
 * momento certo de pedir a permissão (só se ainda não foi respondida).
 */
export interface AssistantLocation {
  getCoordinates(): Promise<Coordinates | null>;
  resolvePlace(coordinates: Coordinates | null): Promise<PlaceHint | null>;
}

const key = ({ latitude, longitude }: Coordinates) => `${latitude.toFixed(3)},${longitude.toFixed(3)}`;

export function createAssistantLocation(service: LocationService = locationService): AssistantLocation {
  const places = new Map<string, PlaceHint | null>();
  return {
    async getCoordinates() {
      let permission = await service.getPermission();
      if (permission === 'undetermined') permission = await service.requestPermission();
      if (permission === 'granted') {
        const fix = await service.locate();
        if (fix?.coordinates) {
          if (fix.place) places.set(key(fix.coordinates), fix.place);
          return fix.coordinates;
        }
      }
      return getManualFix()?.coordinates ?? null;
    },
    async resolvePlace(coordinates) {
      if (!coordinates) return getManualFix()?.place ?? null;
      const cached = places.get(key(coordinates));
      if (cached !== undefined) return cached;
      const place = (await service.reversePlace(coordinates).catch(() => null)) ?? getManualFix()?.place ?? null;
      places.set(key(coordinates), place);
      return place;
    },
  };
}
