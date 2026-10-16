import { CNES_API_URL, createCnesClient } from '@/services/health-units/cnes/client';

import { okJson, page } from '../__fixtures__/cnes';

describe('cliente do CNES', () => {
  it('filtra por município, tipo e ativos; pagina até a página incompleta', async () => {
    const fetchImpl = jest.fn(async (url: string) => {
      const offset = Number(new URL(url).searchParams.get('offset'));
      return okJson(offset === 0 ? page(20, 1) : offset === 20 ? page(20, 21) : page(offset === 40 ? 5 : 0, 41));
    });
    const client = createCnesClient({ fetchImpl });

    const { units, stale } = await client.listUnits('530010', 2);

    expect(units).toHaveLength(45);
    expect(stale).toBe(false);
    const first = new URL(fetchImpl.mock.calls[0][0]);
    expect(`${first.origin}${first.pathname}`).toBe(CNES_API_URL);
    expect(Object.fromEntries(first.searchParams)).toEqual({
      codigo_municipio: '530010',
      codigo_tipo_unidade: '2',
      status: '1',
      limit: '20',
      offset: '0',
    });
    // Segunda chamada vem do cache.
    const calls = fetchImpl.mock.calls.length;
    await client.listUnits('530010', 2);
    expect(fetchImpl).toHaveBeenCalledTimes(calls);
  });

  it('respeita o teto de páginas', async () => {
    const fetchImpl = jest.fn(async (url: string) => {
      const offset = Number(new URL(url).searchParams.get('offset'));
      return okJson(page(20, offset + 1));
    });
    const { units } = await createCnesClient({ fetchImpl, maxPages: 3 }).listUnits('1', 2);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(units).toHaveLength(60);
  });

  it('com a API fora do ar usa a cópia vencida do cache; sem cópia, falha', async () => {
    let now = 0;
    let down = false;
    const fetchImpl = jest.fn(async () => (down ? ({ ok: false, status: 503 } as Response) : okJson(page(3))));
    const { createTtlCache } = jest.requireActual('@/services/health-units/ttl-cache');
    const client = createCnesClient({ fetchImpl, cache: createTtlCache({ ttlMs: 10, now: () => now }) });
    await client.listUnits('530010', 2);
    now = 100;
    down = true;
    await expect(client.listUnits('530010', 2)).resolves.toMatchObject({ stale: true });
    await expect(client.listUnits('999999', 2)).rejects.toThrow('HTTP 503');
  });

  it('erro de formato da resposta', async () => {
    const client = createCnesClient({ fetchImpl: async () => okJson({ outra: [] }) });
    await expect(client.listUnits('1', 2)).rejects.toThrow('inesperada');
  });
});
