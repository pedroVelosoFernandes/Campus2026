import { parseSymptomResult } from './parse';
import type { FetchLike, SymptomAnalyzer } from './types';

/**
 * Implementação de `SymptomAnalyzer` usada pelo app: chama a rota
 * `/api/analyze-symptoms` do nosso servidor, que guarda a chave da OpenAI.
 */
export function createHttpSymptomAnalyzer(
  baseUrl: string,
  fetchImpl: FetchLike = (url, init) => fetch(url, init),
): SymptomAnalyzer {
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/api/analyze-symptoms`;
  return {
    async analyze(input, { signal } = {}) {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal,
      });
      if (!response.ok) throw new Error(`analyze-symptoms respondeu ${response.status}`);
      return parseSymptomResult(await response.json());
    },
  };
}
