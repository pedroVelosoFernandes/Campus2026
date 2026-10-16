import { createRemoteUnitFinder, parseUnitSearchResult } from '@/services/health-units/remote-finder';

const unit = {
  id: 'cnes-1',
  name: 'UBS 1',
  type: 'UBS',
  address: null,
  services: ['ubs'],
  hours: 'Aberto 24 horas',
  howToAccess: 'Recepção',
  distanceKm: 1.2,
  coordinates: { latitude: -15.7, longitude: -47.8 },
};
const ok = (data: unknown) => ({ ok: true, status: 200, json: async () => data }) as Response;

describe('createRemoteUnitFinder (app → /api/health-units)', () => {
  it('envia serviço, coordenadas e município no CORPO (não na URL)', async () => {
    const fetchImpl = jest.fn(async () => ok({ servico: 'ubs', units: [unit], usedLocation: true, notice: 'CNES', dataSource: 'cnes' }));
    const resolvePlace = jest.fn(async () => ({ city: 'Brasília', uf: 'DF' }));
    const finder = createRemoteUnitFinder({ apiUrl: 'https://api.exemplo/', fetchImpl, resolvePlace });
    const coordinates = { latitude: -15.79, longitude: -47.88 };

    const result = await finder.find({ servico: 'ubs', coordinates });

    expect(result.units).toEqual([unit]);
    expect(result.dataSource).toBe('cnes');
    expect(resolvePlace).toHaveBeenCalledWith(coordinates);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.exemplo/api/health-units');
    expect(url).not.toContain('15.79');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ servico: 'ubs', coordinates, place: { city: 'Brasília', uf: 'DF' } });
  });

  it('servidor fora do ar, erro HTTP ou resposta inválida: aviso com canais oficiais, sem lançar', async () => {
    for (const fetchImpl of [
      jest.fn(async () => Promise.reject(new Error('offline'))),
      jest.fn(async () => ({ ok: false, status: 500 }) as Response),
      jest.fn(async () => ok({ qualquer: 1 })),
    ]) {
      const result = await createRemoteUnitFinder({ apiUrl: 'x', fetchImpl }).find({ servico: 'upa' });
      expect(result).toMatchObject({ servico: 'upa', units: [] });
      expect(result.notice).toContain('136');
    }
  });

  it('descarta unidades malformadas', () => {
    const parsed = parseUnitSearchResult({ servico: 'ubs', units: [unit, { id: 1 }], notice: 'n', dataSource: 'cnes' });
    expect(parsed?.units).toHaveLength(1);
    expect(parseUnitSearchResult({ servico: 'spa', units: [], notice: 'n' })).toBeNull();
  });
});
