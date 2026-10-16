import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { MOCK_USER_LOCATION } from '@/mocks/health-units';
import { MOCK_NEARBY_UNITS } from '@/mocks/nearby-units';
import {
  createLocalUnitFinder,
  OFFICIAL_CHANNELS_NOTICE,
  type Coordinates,
  type HealthService,
  type HealthUnitFinder,
  type UnitMatch,
} from '@/services/health-units';

/** Variantes da tela: vacinação (padrão) e UBS de referência (consulta de rotina). */
export type NearbyVariant = 'vacinacao' | 'ubs';

export type VariantCopy = {
  servico: HealthService;
  title: string;
  noteTitle: string;
  noteMessage: string;
};

export const VARIANTS: Record<NearbyVariant, VariantCopy> = {
  vacinacao: {
    servico: 'vacinacao',
    title: 'Vacinação perto de você',
    noteTitle: 'Antes de sair',
    noteMessage: 'Leve documento e carteira de vacinação.',
  },
  ubs: {
    servico: 'ubs',
    title: 'UBS de referência perto de você',
    noteTitle: 'Para a consulta de rotina',
    noteMessage: 'Leve Cartão SUS, documento com foto e comprovante de residência.',
  },
};

/** Lê o parâmetro `servico` da rota; `ubs` e `consulta_rotina` usam a variante UBS. */
export function variantFromParam(servico: string | string[] | undefined): NearbyVariant {
  const value = Array.isArray(servico) ? servico[0] : servico;
  return value === 'ubs' || value === 'consulta_rotina' ? 'ubs' : 'vacinacao';
}

const SERVICE_LABELS: Record<HealthService, string> = {
  vacinacao: 'vacinação',
  ubs: 'atenção básica',
  consulta_rotina: 'consultas de rotina',
  upa: 'urgência 24 horas',
  pronto_socorro: 'pronto-socorro',
  teleconsulta: 'teleconsulta',
  saude_mental: 'saúde mental',
  farmacia_popular: 'Farmácia Popular',
};

/**
 * "Vacinação e atenção básica": o serviço procurado primeiro, seguido do
 * próximo serviço da unidade, em linguagem simples.
 */
export function describeServices(services: readonly HealthService[], wanted?: HealthService): string {
  const ordered = wanted && services.includes(wanted) ? [wanted, ...services.filter((s) => s !== wanted)] : services;
  const [first, second] = ordered.map((service) => SERVICE_LABELS[service]);
  if (!first) return '';
  const text = second ? `${first} e ${second}` : first;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatDistance(km: number | null): string | null {
  if (km === null) return null;
  if (km < 1) return `${Math.max(100, Math.round((km * 1000) / 100) * 100)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

/** Remove o sufixo "(exemplo)" dos nomes fictícios; o mapa já sinaliza que é exemplo. */
export function displayName(name: string): string {
  return name.replace(/\s*\(exemplo\)\s*$/i, '');
}

const COORDINATES = new Map(MOCK_NEARBY_UNITS.map((unit) => [unit.id, unit.coordinates]));

export function coordinatesOf(unitId: string): Coordinates | null {
  return COORDINATES.get(unitId) ?? null;
}

/** Rota até a unidade no Apple Mapas (iOS) ou Google Maps (demais plataformas). */
export function directionsUrl(coords: Coordinates, label: string): string {
  const destination = `${coords.latitude},${coords.longitude}`;
  if (Platform.OS === 'ios') {
    return `https://maps.apple.com/?daddr=${destination}&q=${encodeURIComponent(label)}&dirflg=d`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

export const APPROXIMATE_LOCATION_NOTICE =
  'Sem acesso à sua localização, usamos um ponto aproximado do bairro. ' + OFFICIAL_CHANNELS_NOTICE;

const defaultFinder = createLocalUnitFinder(MOCK_NEARBY_UNITS);

export type NearbyUnitsState = {
  units: UnitMatch[];
  /** Ponto de origem usado na busca (hoje sempre o ponto aproximado de demonstração). */
  origin: Coordinates;
  notice: string;
  loading: boolean;
};

/**
 * Busca as unidades que oferecem o serviço (o finder filtra por serviço e só
 * depois ordena por distância). Sem permissão de localização no app, usa o
 * ponto aproximado do bairro e avisa para confirmar nos canais oficiais.
 */
export function useNearbyUnits(servico: HealthService, finder: HealthUnitFinder = defaultFinder): NearbyUnitsState {
  const [result, setResult] = useState<{ servico: HealthService; units: UnitMatch[] } | null>(null);

  useEffect(() => {
    let active = true;
    finder
      .find({ servico, coordinates: MOCK_USER_LOCATION })
      .then((found) => {
        if (active) setResult({ servico, units: found.units });
      })
      .catch(() => {
        if (active) setResult({ servico, units: [] });
      });
    return () => {
      active = false;
    };
  }, [finder, servico]);

  return useMemo(
    () => ({
      units: result?.servico === servico ? result.units : [],
      origin: MOCK_USER_LOCATION,
      notice: APPROXIMATE_LOCATION_NOTICE,
      loading: result?.servico !== servico,
    }),
    [result, servico],
  );
}
