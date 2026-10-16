import { handleHealthUnits, parseUnitsRequest } from '@/services/health-units/server-handler';
import type { HealthUnitFinder } from '@/services/health-units';

const post = (body: unknown) =>
  new Request('https://api.exemplo/api/health-units', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('POST /api/health-units', () => {
  const finder: HealthUnitFinder = {
    find: jest.fn(async (query) => ({ servico: query.servico, units: [], usedLocation: false, notice: 'ok', dataSource: 'cnes' as const })),
  };

  it('valida o corpo e repassa a busca ao finder do CNES', async () => {
    const response = await handleHealthUnits(
      post({ servico: 'vacinacao', coordinates: { latitude: -15.7, longitude: -47.8 }, place: { city: 'Brasília', uf: 'DF' } }),
      { finder },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(finder.find).toHaveBeenCalledWith({
      servico: 'vacinacao',
      coordinates: { latitude: -15.7, longitude: -47.8 },
      place: { city: 'Brasília', uf: 'DF', ibgeCode: undefined },
    });
  });

  it('400 para JSON inválido ou serviço desconhecido', async () => {
    expect((await handleHealthUnits(post('{'), { finder })).status).toBe(400);
    expect((await handleHealthUnits(post({ servico: 'spa' }), { finder })).status).toBe(400);
  });

  it('respeita o guard (sessão / limite)', async () => {
    const guard = jest.fn(async () => Response.json({ error: 'x' }, { status: 401 }));
    const response = await handleHealthUnits(post({ servico: 'ubs' }), { finder, guard });
    expect(response.status).toBe(401);
  });

  it('ignora coordenadas inválidas e textos enormes', () => {
    const parsed = parseUnitsRequest({
      servico: 'ubs',
      coordinates: { latitude: 300, longitude: 'a' },
      place: { city: 'x'.repeat(500) },
    });
    expect(parsed.ok && parsed.value.coordinates).toBeNull();
    expect(parsed.ok && parsed.value.place?.city).toHaveLength(80);
  });
});
