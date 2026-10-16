import { defaultFetch, fetchJson, type FetchLike } from './http';
import { createTtlCache, type TtlCache } from './ttl-cache';
import type { PlaceHint } from './types';

/**
 * Resolve o município (código IBGE) a partir de cidade + UF, usando a API de
 * localidades do IBGE (https://servicodados.ibge.gov.br/api/docs/localidades).
 * O app obtém cidade/UF do GPS com `reverseGeocodeAsync` (no aparelho); o
 * servidor só recebe o nome da cidade, não precisa de geocodificação própria.
 *
 * O CNES usa o código IBGE de 6 dígitos (sem o dígito verificador): 5300108 → 530010.
 */

export const IBGE_MUNICIPIOS_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados';
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const UF_BY_NAME: Record<string, string> = {
  acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA', ceara: 'CE',
  'distrito federal': 'DF', 'espirito santo': 'ES', goias: 'GO', maranhao: 'MA',
  'mato grosso': 'MT', 'mato grosso do sul': 'MS', 'minas gerais': 'MG', para: 'PA',
  paraiba: 'PB', parana: 'PR', pernambuco: 'PE', piaui: 'PI', 'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN', 'rio grande do sul': 'RS', rondonia: 'RO', roraima: 'RR',
  'santa catarina': 'SC', 'sao paulo': 'SP', sergipe: 'SE', tocantins: 'TO',
};
const UFS = new Set(Object.values(UF_BY_NAME));

/**
 * Capitais (código IBGE de 7 dígitos), resolvidas sem rede. Também cobre a
 * falha conhecida de TLS do servidor do IBGE em Node (cadeia de certificado
 * incompleta; ver docs/producao.md). O DF tem um único município: Brasília.
 */
const CAPITALS: Record<string, [string, number]> = {
  AC: ['Rio Branco', 1200401], AL: ['Maceió', 2704302], AP: ['Macapá', 1600303], AM: ['Manaus', 1302603],
  BA: ['Salvador', 2927408], CE: ['Fortaleza', 2304400], DF: ['Brasília', 5300108], ES: ['Vitória', 3205309],
  GO: ['Goiânia', 5208707], MA: ['São Luís', 2111300], MT: ['Cuiabá', 5103403], MS: ['Campo Grande', 5002704],
  MG: ['Belo Horizonte', 3106200], PA: ['Belém', 1501402], PB: ['João Pessoa', 2507507], PR: ['Curitiba', 4106902],
  PE: ['Recife', 2611606], PI: ['Teresina', 2211001], RJ: ['Rio de Janeiro', 3304557], RN: ['Natal', 2408102],
  RS: ['Porto Alegre', 4314902], RO: ['Porto Velho', 1100205], RR: ['Boa Vista', 1400100],
  SC: ['Florianópolis', 4205407], SP: ['São Paulo', 3550308], SE: ['Aracaju', 2800308], TO: ['Palmas', 1721000],
};

function capitalOf(uf: string, city: string): Municipality | null {
  const capital = CAPITALS[uf];
  if (!capital || (uf !== 'DF' && normalizeName(capital[0]) !== normalizeName(city))) return null;
  return { code: String(capital[1]).slice(0, 6), name: capital[0], uf };
}

export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "DF", "df", "Distrito Federal" ou "State of São Paulo" → sigla; `null` se não reconhecer. */
export function toUf(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (UFS.has(trimmed.toUpperCase())) return trimmed.toUpperCase();
  const name = normalizeName(trimmed).replace(/^(state of|estado de|estado do|estado da)\s+/, '');
  return UF_BY_NAME[name] ?? null;
}

/** Extrai "Cidade - UF", "Cidade/UF" ou "Bairro, Cidade, UF" de um texto livre. */
export function placeFromText(text: string | undefined): PlaceHint | null {
  if (!text) return null;
  const parts = text.split(/\s*[,/–-]\s*/).filter(Boolean);
  if (parts.length < 2) return null;
  const uf = toUf(parts[parts.length - 1]);
  const city = parts[parts.length - 2];
  return uf && city ? { city, uf } : null;
}

/** Código de 6 dígitos usado pelo CNES. */
export function toCnesMunicipalityCode(code: string | number): string | null {
  const digits = String(code).replace(/\D/g, '');
  return digits.length === 6 || digits.length === 7 ? digits.slice(0, 6) : null;
}

interface IbgeMunicipio {
  id: number;
  nome: string;
}

export interface MunicipalityResolverOptions {
  /** Padrão: API de localidades do IBGE. */
  baseUrl?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  cache?: TtlCache<IbgeMunicipio[]>;
}

export interface Municipality {
  code: string;
  name: string;
  uf: string;
}

export type MunicipalityResolver = (place: PlaceHint) => Promise<Municipality | null>;

export function createMunicipalityResolver(options: MunicipalityResolverOptions = {}): MunicipalityResolver {
  const fetchImpl = options.fetchImpl ?? defaultFetch;
  const baseUrl = options.baseUrl ?? IBGE_MUNICIPIOS_URL;
  const timeoutMs = options.timeoutMs ?? 6_000;
  const cache = options.cache ?? createTtlCache<IbgeMunicipio[]>({ ttlMs: MONTH_MS, maxEntries: 27 });

  async function listMunicipios(uf: string): Promise<IbgeMunicipio[]> {
    return cache.getOrLoad(uf, async () => {
      const data = await fetchJson(`${baseUrl}/${uf}/municipios`, fetchImpl, timeoutMs);
      if (!Array.isArray(data)) throw new Error('Resposta inesperada do IBGE');
      return data.filter(
        (item): item is IbgeMunicipio => typeof item?.id === 'number' && typeof item?.nome === 'string',
      );
    });
  }

  return async (place) => {
    const uf = toUf(place.uf);
    if (place.ibgeCode) {
      const code = toCnesMunicipalityCode(place.ibgeCode);
      if (code) return { code, name: place.city ?? '', uf: uf ?? '' };
    }
    if (!uf || !place.city?.trim()) return null;
    const capital = capitalOf(uf, place.city);
    if (capital) return capital;
    const wanted = normalizeName(place.city);
    const municipios = await listMunicipios(uf);
    const found = municipios.find((item) => normalizeName(item.nome) === wanted);
    const code = found ? toCnesMunicipalityCode(found.id) : null;
    return found && code ? { code, name: found.nome, uf } : null;
  };
}
