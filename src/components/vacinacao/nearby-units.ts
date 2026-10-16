import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { MOCK_USER_LOCATION } from '@/mocks/health-units';
import { MOCK_NEARBY_UNITS } from '@/mocks/nearby-units';
import type { LocationFix } from '@/features/location/types';
import {
  createLocalUnitFinder,
  distanceKm,
  OFFICIAL_CHANNELS_NOTICE,
  type Coordinates,
  type HealthService,
  type HealthUnitFinder,
  type PlaceHint,
  type UnitMatch,
  type UnitSearchResult,
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

export function coordinatesOf(unit: Pick<UnitMatch, 'id' | 'coordinates'>): Coordinates | null {
  return unit.coordinates ?? COORDINATES.get(unit.id) ?? null;
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

/** Versão de uma linha para a tela; o aviso completo fica na lista "Ver outras unidades". */
export const COMPACT_LOCATION_NOTICE = 'Local aproximado. Confirme pelo Disque Saúde 136 antes de ir.';

/** Aviso curto sob o cartão: "Local aproximado" só quando o ponto não é o GPS atual. */
export function compactNoticeFor(approximate: boolean, dataSource: UnitSearchResult['dataSource']): string {
  if (approximate) return COMPACT_LOCATION_NOTICE;
  return dataSource === 'cnes'
    ? 'Dados do CNES. Confirme pelo Disque Saúde 136 antes de ir.'
    : 'Dados de exemplo. Confirme pelo Disque Saúde 136 antes de ir.';
}

/** Ponto e município usados na busca. */
export type NearbySearch = { coordinates: Coordinates | null; place: PlaceHint | null; approximate: boolean };

/** Raio da região de demonstração: fora dele, as unidades fictícias não fazem sentido. */
const DEMO_RADIUS_KM = 60;

/** Modo exemplo: usa o GPS se a pessoa estiver na região da demo; senão, o ponto aproximado. */
export function demoSearch(fix: LocationFix | null): NearbySearch {
  if (fix?.coordinates && distanceKm(fix.coordinates, MOCK_USER_LOCATION) <= DEMO_RADIUS_KM) {
    return { coordinates: fix.coordinates, place: fix.place, approximate: fix.approximate };
  }
  return { coordinates: MOCK_USER_LOCATION, place: null, approximate: true };
}

export const defaultFinder = createLocalUnitFinder(MOCK_NEARBY_UNITS);

export type NearbyUnitsState = {
  units: UnitMatch[];
  notice: string;
  /** Aviso curto exibido sob o cartão. */
  compactNotice: string;
  dataSource: UnitSearchResult['dataSource'];
  loading: boolean;
};

const searchKey = (servico: HealthService, search: NearbySearch | null) =>
  search
    ? [servico, search.coordinates?.latitude, search.coordinates?.longitude, search.place?.city, search.place?.uf].join('|')
    : null;

/**
 * Busca as unidades que oferecem o serviço (o finder filtra por serviço e só
 * depois ordena por distância). `search` nulo = ainda esperando a localização.
 */
export function useNearbyUnits(
  servico: HealthService,
  search: NearbySearch | null,
  finder: HealthUnitFinder = defaultFinder,
): NearbyUnitsState {
  const [state, setState] = useState<{ key: string; result: UnitSearchResult | null } | null>(null);
  const key = searchKey(servico, search);
  const latitude = search?.coordinates?.latitude;
  const longitude = search?.coordinates?.longitude;
  const city = search?.place?.city;
  const uf = search?.place?.uf;

  useEffect(() => {
    if (!key) return;
    let active = true;
    const coordinates = latitude !== undefined && longitude !== undefined ? { latitude, longitude } : null;
    finder
      .find({ servico, coordinates, place: city ? { city, uf } : null })
      .then((result) => active && setState({ key, result }))
      .catch(() => active && setState({ key, result: null }));
    return () => {
      active = false;
    };
  }, [city, finder, key, latitude, longitude, servico, uf]);

  const approximate = search?.approximate ?? true;
  return useMemo(() => {
    const result = state?.key === key ? state.result : undefined;
    const dataSource = result?.dataSource ?? (finder === defaultFinder ? 'exemplo' : 'cnes');
    return {
      units: result?.units ?? [],
      notice: result && (result.dataSource === 'cnes' || !approximate) ? result.notice : APPROXIMATE_LOCATION_NOTICE,
      compactNotice: compactNoticeFor(approximate, dataSource),
      dataSource,
      loading: key === null || result === undefined,
    };
  }, [approximate, finder, key, state]);
}
