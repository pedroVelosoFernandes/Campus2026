import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { useSettings } from '@/features/settings';
import { MOCK_USER_LOCATION } from '@/mocks/health-units';
import { MOCK_NEARBY_UNITS } from '@/mocks/nearby-units';
import {
  createLocalUnitFinder,
  type Coordinates,
  type HealthService,
  type HealthUnitFinder,
  type UnitMatch,
} from '@/services/health-units';

const SERVICE_NAMES: Record<HealthService, string> = {
  vacinacao: 'Vacinação',
  ubs: 'Atenção básica',
  consulta_rotina: 'Consultas de rotina',
  upa: 'Urgência 24 horas',
  pronto_socorro: 'Pronto-socorro',
  teleconsulta: 'Teleconsulta',
  saude_mental: 'Saúde mental',
  farmacia_popular: 'Farmácia Popular',
};

/** Remove o sufixo "(exemplo)" dos nomes fictícios. */
export function displayName(name: string): string {
  return name.replace(/\s*\(exemplo\)\s*$/i, '');
}

export function formatDistance(km: number | null): string | null {
  if (km === null) return null;
  if (km < 1) return `${Math.max(100, Math.round((km * 1000) / 100) * 100)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

const MOCK_COORDINATES = new Map(MOCK_NEARBY_UNITS.map((unit) => [unit.id, unit.coordinates]));

/** Ponto da unidade: o que veio da busca ou, para os exemplos, o dos dados locais. */
export function unitCoordinates(unit: UnitMatch): Coordinates | null {
  const fromSearch = (unit as { coordinates?: Coordinates | null }).coordinates;
  return fromSearch ?? MOCK_COORDINATES.get(unit.id) ?? null;
}

/** Rota até a unidade no Apple Mapas (iOS) ou Google Maps (demais plataformas). */
export function directionsUrl(coords: Coordinates, label: string): string {
  const destination = `${coords.latitude},${coords.longitude}`;
  if (Platform.OS === 'ios') {
    return `https://maps.apple.com/?daddr=${destination}&q=${encodeURIComponent(label)}&dirflg=d`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

/** Nomes dos serviços para os selos do cartão, na ordem em que a unidade os oferece. */
export function serviceNames(services: readonly HealthService[]): string[] {
  return services.map((service) => SERVICE_NAMES[service]);
}

/** Nome da unidade salva (síncrono, para a linha do Perfil). */
export function referenceUnitName(unitId: string): string {
  const unit = MOCK_NEARBY_UNITS.find((candidate) => candidate.id === unitId) ?? MOCK_NEARBY_UNITS[0];
  return displayName(unit.name);
}

export type RoutineStep = { title: string; text: string };

/** Como funciona a consulta de rotina na UBS (orientação geral; varia por município). */
export const ROUTINE_STEPS: readonly RoutineStep[] = [
  {
    title: 'Faça ou atualize seu cadastro',
    text: 'Na recepção, com documento com foto, Cartão SUS ou CPF e comprovante de endereço.',
  },
  {
    title: 'Peça para agendar',
    text: 'Na recepção, por telefone ou pelo canal da prefeitura. Em muitas UBS há acolhimento no mesmo dia para quem precisa.',
  },
  {
    title: 'No dia da consulta',
    text: 'Chegue um pouco antes e leve exames anteriores e a lista dos remédios que você usa.',
  },
  {
    title: 'Encaminhamentos',
    text: 'Se precisar de especialista ou exame, a própria UBS faz o pedido e avisa quando houver vaga.',
  },
];

const defaultFinder = createLocalUnitFinder(MOCK_NEARBY_UNITS);

export type ReferenceUnitState = {
  /** UBS que podem ser referência (consulta de rotina), mais próximas primeiro. */
  units: UnitMatch[];
  current: UnitMatch | null;
  select: (unitId: string) => void;
  loading: boolean;
};

/** Unidade de referência salva nas preferências + opções para trocar. */
export function useReferenceUnit(finder: HealthUnitFinder = defaultFinder): ReferenceUnitState {
  const { settings, update } = useSettings();
  const [units, setUnits] = useState<UnitMatch[] | null>(null);

  useEffect(() => {
    let active = true;
    finder
      .find({ servico: 'consulta_rotina', coordinates: MOCK_USER_LOCATION })
      .then((result) => {
        if (active) setUnits(result.units);
      })
      .catch(() => {
        if (active) setUnits([]);
      });
    return () => {
      active = false;
    };
  }, [finder]);

  return useMemo(() => {
    const list = units ?? [];
    const current = list.find((unit) => unit.id === settings.referenceUnitId) ?? list[0] ?? null;
    return {
      units: list,
      current,
      loading: units === null,
      select: (unitId: string) => update({ referenceUnitId: unitId }),
    };
  }, [settings.referenceUnitId, units, update]);
}
