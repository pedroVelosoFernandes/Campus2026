import type { Coordinates, PlaceHint } from '@/services/health-units/types';

export type { Coordinates, PlaceHint };

export type LocationPermission = 'granted' | 'denied' | 'undetermined';

/** De onde veio o ponto usado na busca. */
export type LocationSource = 'gps' | 'ultima-conhecida' | 'cidade-informada' | 'aproximada';

export interface LocationFix {
  coordinates: Coordinates | null;
  /** `true` quando não é a posição atual do aparelho (última conhecida, cidade digitada, ponto de demonstração). */
  approximate: boolean;
  source: LocationSource;
  /** Município, quando conhecido (geocodificação reversa ou digitado). */
  place: PlaceHint | null;
}
