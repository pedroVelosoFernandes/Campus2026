export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export const defaultFetch: FetchLike = (input, init) => fetch(input, init);

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

/** GET JSON com limite de tempo; erros de rede, tempo e status viram `UpstreamError`. */
export async function fetchJson(url: string, fetchImpl: FetchLike, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new UpstreamError(`HTTP ${response.status}`, response.status);
    return await response.json();
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    throw new UpstreamError(controller.signal.aborted ? 'tempo esgotado' : 'falha de rede');
  } finally {
    clearTimeout(timer);
  }
}
