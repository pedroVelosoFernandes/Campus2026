import { defaultFetch, fetchJson, UpstreamError, type FetchLike } from '../http';
import { createTtlCache, type TtlCache } from '../ttl-cache';
import type { HealthUnit } from '../types';
import { normalizeEstabelecimento } from './normalize';
import type { CnesEstabelecimento } from './types';

/**
 * Cliente do endpoint `GET /cnes/estabelecimentos` (API de Dados Abertos do
 * Ministério da Saúde, sem autenticação, licença de dados abertos).
 * - filtros: `codigo_municipio` (IBGE, 6 dígitos), `codigo_tipo_unidade`, `status=1` (ativos);
 * - paginação: `limit` ≤ 20 e `offset` (na prática, deslocamento em itens);
 * - o resultado normalizado fica em cache por município + tipo.
 */

export const CNES_API_URL = 'https://apidadosabertos.saude.gov.br/cnes/estabelecimentos';
export const CNES_PAGE_SIZE = 20;
/** Teto de páginas por tipo (20 × 25 = 500 unidades): protege a API pública e o tempo de resposta. */
export const CNES_MAX_PAGES = 25;
const PARALLEL_PAGES = 5;
const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;

export interface CnesClientOptions {
  baseUrl?: string;
  fetchImpl?: FetchLike;
  /** Limite por requisição à API do CNES. */
  timeoutMs?: number;
  ttlMs?: number;
  maxPages?: number;
  cache?: TtlCache<HealthUnit[]>;
}

export interface CnesUnitsResult {
  units: HealthUnit[];
  /** `true` quando a API falhou e usamos uma cópia vencida do cache. */
  stale: boolean;
}

export interface CnesClient {
  listUnits(municipalityCode: string, typeCode: number): Promise<CnesUnitsResult>;
}

function pageUrl(baseUrl: string, municipalityCode: string, typeCode: number, page: number): string {
  const params = new URLSearchParams({
    codigo_municipio: municipalityCode,
    codigo_tipo_unidade: String(typeCode),
    status: '1',
    limit: String(CNES_PAGE_SIZE),
    offset: String(page * CNES_PAGE_SIZE),
  });
  return `${baseUrl}?${params.toString()}`;
}

function readPage(data: unknown): CnesEstabelecimento[] {
  const list = (data as { estabelecimentos?: unknown } | null)?.estabelecimentos;
  if (!Array.isArray(list)) throw new UpstreamError('Resposta inesperada do CNES');
  return list.filter((item): item is CnesEstabelecimento => typeof item?.codigo_cnes === 'number');
}

export function createCnesClient(options: CnesClientOptions = {}): CnesClient {
  const baseUrl = options.baseUrl ?? CNES_API_URL;
  const fetchImpl = options.fetchImpl ?? defaultFetch;
  const timeoutMs = options.timeoutMs ?? 6_000;
  const maxPages = options.maxPages ?? CNES_MAX_PAGES;
  const cache = options.cache ?? createTtlCache<HealthUnit[]>({ ttlMs: options.ttlMs ?? DEFAULT_TTL_MS });

  const fetchPage = async (municipalityCode: string, typeCode: number, page: number) =>
    readPage(await fetchJson(pageUrl(baseUrl, municipalityCode, typeCode, page), fetchImpl, timeoutMs));

  /** Primeira página sozinha (a maioria dos municípios cabe nela); depois, lotes em paralelo. */
  async function fetchAll(municipalityCode: string, typeCode: number): Promise<HealthUnit[]> {
    const items = await fetchPage(municipalityCode, typeCode, 0);
    let reachedEnd = items.length < CNES_PAGE_SIZE;
    for (let first = 1; !reachedEnd && first < maxPages; first += PARALLEL_PAGES) {
      const pages = Array.from({ length: Math.min(PARALLEL_PAGES, maxPages - first) }, (_, i) => first + i);
      const results = await Promise.all(pages.map((page) => fetchPage(municipalityCode, typeCode, page)));
      for (const result of results) {
        items.push(...result);
        if (result.length < CNES_PAGE_SIZE) reachedEnd = true;
      }
    }
    const seen = new Set<string>();
    return items
      .map(normalizeEstabelecimento)
      .filter((unit): unit is HealthUnit => unit !== null && !seen.has(unit.id) && (seen.add(unit.id), true));
  }

  return {
    async listUnits(municipalityCode, typeCode) {
      const key = `${municipalityCode}:${typeCode}`;
      try {
        return { units: await cache.getOrLoad(key, () => fetchAll(municipalityCode, typeCode)), stale: false };
      } catch (error) {
        const stale = cache.getStale(key);
        if (stale) return { units: stale, stale: true };
        throw error;
      }
    },
  };
}
