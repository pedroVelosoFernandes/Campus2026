import type { CnesClient } from '@/services/health-units/cnes/client';
import { createCnesUnitFinder, VACCINE_AVAILABILITY_NOTICE } from '@/services/health-units/cnes/finder';
import { normalizeEstabelecimento } from '@/services/health-units/cnes/normalize';
import type { HealthUnit } from '@/services/health-units';

import { estabelecimento } from '../__fixtures__/cnes';

const origin = { latitude: -15.79, longitude: -47.88 };
const unit = (overrides: Parameters<typeof estabelecimento>[0]) =>
  normalizeEstabelecimento(estabelecimento(overrides)) as HealthUnit;

const ubsNear = unit({ codigo_cnes: 1, nome_fantasia: 'UBS PERTO', latitude_estabelecimento_decimo_grau: -15.791, longitude_estabelecimento_decimo_grau: -47.881 });
const ubsFar = unit({ codigo_cnes: 2, nome_fantasia: 'UBS LONGE', latitude_estabelecimento_decimo_grau: -15.9 });
const upa = unit({ codigo_cnes: 3, nome_fantasia: 'UPA CENTRO', codigo_tipo_unidade: 73 });

function fakeClient(byType: Record<number, HealthUnit[] | Error>, stale = false): CnesClient {
  return {
    listUnits: jest.fn(async (_code: string, type: number) => {
      const value = byType[type] ?? [];
      if (value instanceof Error) throw value;
      return { units: value, stale };
    }),
  };
}

const brasilia = jest.fn(async () => ({ code: '530010', name: 'Brasília', uf: 'DF' }));

describe('CnesHealthUnitFinder', () => {
  it('filtra pelo serviço e ordena por distância; avisa sobre disponibilidade de vacinas', async () => {
    const client = fakeClient({ 2: [ubsFar, ubsNear], 73: [upa] });
    const finder = createCnesUnitFinder({ client, resolveMunicipality: brasilia });

    const result = await finder.find({ servico: 'vacinacao', coordinates: origin, place: { city: 'Brasília', uf: 'DF' } });

    expect(result.units.map((u) => u.name)).toEqual(['UBS Perto', 'UBS Longe']);
    expect(result.units[0].distanceKm).toBeLessThan(1);
    expect(result.dataSource).toBe('cnes');
    expect(result.notice).toContain('CNES');
    expect(result.notice).toContain(VACCINE_AVAILABILITY_NOTICE);
    expect(result.notice).toContain('136');
    expect(client.listUnits).toHaveBeenCalledWith('530010', 85);
  });

  it('urgência busca UPA e não UBS', async () => {
    const finder = createCnesUnitFinder({ client: fakeClient({ 2: [ubsNear], 73: [upa] }), resolveMunicipality: brasilia });
    const result = await finder.find({ servico: 'upa', coordinates: origin, place: { city: 'Brasília', uf: 'DF' } });
    expect(result.units.map((u) => u.type)).toEqual(['UPA']);
  });

  it('usa a cidade dita na conversa quando não há município', async () => {
    const resolveMunicipality = jest.fn(brasilia);
    const finder = createCnesUnitFinder({ client: fakeClient({ 2: [ubsNear] }), resolveMunicipality });
    const result = await finder.find({ servico: 'ubs', localizacao: 'Asa Norte, Brasília - DF' });
    expect(resolveMunicipality).toHaveBeenCalledWith({ city: 'Brasília', uf: 'DF' });
    expect(result.notice).toMatch(/distâncias não foram calculadas/);
  });

  it('sem município conhecido explica e indica canais oficiais', async () => {
    const finder = createCnesUnitFinder({ client: fakeClient({}), resolveMunicipality: brasilia });
    const result = await finder.find({ servico: 'ubs' });
    expect(result.units).toEqual([]);
    expect(result.notice).toMatch(/identificar seu município/);
    expect(result.notice).toContain('Disque Saúde 136');
  });

  it('API do CNES fora do ar: resultado vazio com a limitação explicada', async () => {
    const finder = createCnesUnitFinder({
      client: fakeClient({ 2: new Error('timeout'), 1: new Error('timeout') }),
      resolveMunicipality: brasilia,
    });
    const result = await finder.find({ servico: 'ubs', place: { city: 'Brasília', uf: 'DF' } });
    expect(result.units).toEqual([]);
    expect(result.notice).toMatch(/Não consegui consultar a base oficial/);
  });

  it('falha parcial e cache vencido são avisados', async () => {
    const finder = createCnesUnitFinder({
      client: fakeClient({ 2: [ubsNear], 1: new Error('x') }, true),
      resolveMunicipality: brasilia,
    });
    const result = await finder.find({ servico: 'ubs', place: { city: 'Brasília', uf: 'DF' } });
    expect(result.units).toHaveLength(1);
    expect(result.notice).toMatch(/incompleta/);
    expect(result.notice).toMatch(/última consulta salva/);
  });

  it('IBGE fora do ar e serviços sem endereço no CNES', async () => {
    const failing = createCnesUnitFinder({ client: fakeClient({}), resolveMunicipality: async () => Promise.reject(new Error()) });
    expect((await failing.find({ servico: 'ubs', place: { city: 'X', uf: 'SP' } })).notice).toMatch(/IBGE/);
    const finder = createCnesUnitFinder({ client: fakeClient({}), resolveMunicipality: brasilia });
    expect((await finder.find({ servico: 'teleconsulta' })).notice).toMatch(/Meu SUS Digital/);
    expect((await finder.find({ servico: 'farmacia_popular' })).notice).toMatch(/Farmácia Popular/);
  });
});
