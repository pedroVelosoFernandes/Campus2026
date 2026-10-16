import { createMunicipalityResolver, placeFromText, type Municipality, type MunicipalityResolver } from '../ibge';
import { OFFICIAL_CHANNELS_NOTICE, searchUnits } from '../local-finder';
import type { HealthUnit, HealthUnitFinder, UnitSearchQuery, UnitSearchResult } from '../types';
import { createCnesClient, type CnesClient } from './client';
import { CNES_TYPES_BY_SERVICE, NON_CNES_GUIDANCE } from './mapping';

/**
 * `HealthUnitFinder` com dados oficiais do CNES. Roda no SERVIDOR (rota
 * `/api/health-units`): resolve o município, busca os tipos de estabelecimento
 * que atendem o serviço, filtra pelo serviço e só então ordena por distância.
 * Nunca lança: falhas viram um resultado vazio com a limitação explicada e os
 * canais oficiais (docs/features.md, seção 4).
 */

export const VACCINE_AVAILABILITY_NOTICE =
  'O CNES não informa quais vacinas há em cada unidade: confirme a disponibilidade antes de ir.';

export interface CnesFinderOptions {
  client?: CnesClient;
  resolveMunicipality?: MunicipalityResolver;
}

type Outcome = { units: HealthUnit[]; stale: boolean; failed: number; total: number };

function result(query: UnitSearchQuery, units: UnitSearchResult['units'], notice: string[]): UnitSearchResult {
  return {
    servico: query.servico,
    units,
    usedLocation: !!query.coordinates,
    notice: [...notice, OFFICIAL_CHANNELS_NOTICE].join(' '),
    dataSource: 'cnes',
  };
}

async function loadUnits(client: CnesClient, municipality: Municipality, types: number[]): Promise<Outcome> {
  const settled = await Promise.allSettled(types.map((type) => client.listUnits(municipality.code, type)));
  const outcome: Outcome = { units: [], stale: false, failed: 0, total: types.length };
  for (const item of settled) {
    if (item.status === 'rejected') {
      outcome.failed += 1;
      continue;
    }
    outcome.units.push(...item.value.units);
    outcome.stale ||= item.value.stale;
  }
  return outcome;
}

function placeLabel(municipality: Municipality): string {
  return municipality.uf ? `${municipality.name || 'seu município'}/${municipality.uf}` : 'seu município';
}

function describe(query: UnitSearchQuery, municipality: Municipality, outcome: Outcome, found: number): string[] {
  const notes: string[] = [];
  if (found === 0) notes.push(`Não encontrei unidades com esse serviço no CNES para ${placeLabel(municipality)}.`);
  else notes.push(`Dados oficiais do CNES (Ministério da Saúde) para ${placeLabel(municipality)}.`);
  if (!query.coordinates) notes.push('Sem sua localização exata, as distâncias não foram calculadas.');
  if (outcome.stale) notes.push('A base oficial não respondeu agora; usei a última consulta salva.');
  if (outcome.failed > 0) notes.push('Parte da base oficial não respondeu, então a lista pode estar incompleta.');
  if (query.servico === 'vacinacao' && found > 0) notes.push(VACCINE_AVAILABILITY_NOTICE);
  return notes;
}

async function resolve(resolver: MunicipalityResolver, query: UnitSearchQuery): Promise<Municipality | 'unknown' | 'error'> {
  const place = query.place ?? placeFromText(query.localizacao);
  if (!place) return 'unknown';
  try {
    return (await resolver(place)) ?? 'unknown';
  } catch {
    return 'error';
  }
}

export function createCnesUnitFinder(options: CnesFinderOptions = {}): HealthUnitFinder {
  const client = options.client ?? createCnesClient();
  const resolver = options.resolveMunicipality ?? createMunicipalityResolver();

  return {
    async find(query) {
      const types = CNES_TYPES_BY_SERVICE[query.servico];
      const guidance = NON_CNES_GUIDANCE[query.servico];
      if (types.length === 0) return result(query, [], guidance ? [guidance] : []);

      const municipality = await resolve(resolver, query);
      if (municipality === 'unknown') {
        return result(query, [], [
          'Não consegui identificar seu município. Diga a cidade e o estado (por exemplo, "Campinas, SP") ' +
            'ou permita o acesso à localização.',
        ]);
      }
      if (municipality === 'error') {
        return result(query, [], ['Não consegui consultar a base de municípios do IBGE agora.']);
      }
      const outcome = await loadUnits(client, municipality, types);
      if (outcome.failed === outcome.total) {
        return result(query, [], ['Não consegui consultar a base oficial de unidades (CNES) agora.']);
      }
      const { units } = searchUnits(outcome.units, query);
      return result(query, units, describe(query, municipality, outcome, units.length));
    },
  };
}
