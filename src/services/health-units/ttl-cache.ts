/**
 * Cache em memória com validade (TTL) e limite de entradas. Mantém o valor
 * vencido para servir como reserva quando a fonte oficial estiver fora do ar.
 * Por processo: em produção com várias instâncias, cada uma tem o seu cache.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export interface TtlCacheOptions {
  ttlMs: number;
  maxEntries?: number;
  now?: () => number;
}

export interface TtlCache<T> {
  /** Valor ainda válido, ou `undefined`. */
  get(key: string): T | undefined;
  /** Valor mesmo vencido (reserva para quando a API cair). */
  getStale(key: string): T | undefined;
  set(key: string, value: T): void;
  /** Busca com cache e deduplica chamadas simultâneas para a mesma chave. */
  getOrLoad(key: string, load: () => Promise<T>): Promise<T>;
  clear(): void;
}

export function createTtlCache<T>({ ttlMs, maxEntries = 200, now = Date.now }: TtlCacheOptions): TtlCache<T> {
  const entries = new Map<string, Entry<T>>();
  const inFlight = new Map<string, Promise<T>>();

  function set(key: string, value: T) {
    entries.delete(key);
    entries.set(key, { value, expiresAt: now() + ttlMs });
    // Map preserva a ordem de inserção: a primeira chave é a mais antiga.
    while (entries.size > maxEntries) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      entries.delete(oldest);
    }
  }

  function get(key: string): T | undefined {
    const entry = entries.get(key);
    return entry && entry.expiresAt > now() ? entry.value : undefined;
  }

  return {
    get,
    getStale: (key) => entries.get(key)?.value,
    set,
    getOrLoad(key, load) {
      const fresh = get(key);
      if (fresh !== undefined) return Promise.resolve(fresh);
      const pending = inFlight.get(key);
      if (pending) return pending;
      const promise = load()
        .then((value) => {
          set(key, value);
          return value;
        })
        .finally(() => inFlight.delete(key));
      inFlight.set(key, promise);
      return promise;
    },
    clear: () => {
      entries.clear();
      inFlight.clear();
    },
  };
}
