import { createTtlCache } from '@/services/health-units/ttl-cache';

describe('createTtlCache', () => {
  it('expira pelo TTL, mas guarda o valor vencido como reserva', async () => {
    let now = 0;
    const cache = createTtlCache<string>({ ttlMs: 100, now: () => now });
    cache.set('a', 'x');
    expect(cache.get('a')).toBe('x');
    now = 150;
    expect(cache.get('a')).toBeUndefined();
    expect(cache.getStale('a')).toBe('x');
  });

  it('deduplica cargas simultâneas e limita o número de entradas', async () => {
    const cache = createTtlCache<number>({ ttlMs: 1000, maxEntries: 2 });
    const load = jest.fn(async () => 1);
    await Promise.all([cache.getOrLoad('a', load), cache.getOrLoad('a', load)]);
    expect(load).toHaveBeenCalledTimes(1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.getStale('a')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
  });

  it('não guarda falhas', async () => {
    const cache = createTtlCache<number>({ ttlMs: 1000 });
    await expect(cache.getOrLoad('a', async () => Promise.reject(new Error('fora')))).rejects.toThrow('fora');
    await expect(cache.getOrLoad('a', async () => 7)).resolves.toBe(7);
  });
});
