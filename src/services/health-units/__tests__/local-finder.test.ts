import { MOCK_HEALTH_UNITS, MOCK_USER_LOCATION } from '@/mocks/health-units';
import { distanceKm, parseUnitSearchInput, searchUnits } from '@/services/health-units';
import type { HealthUnit } from '@/services/health-units';

describe('parseUnitSearchInput', () => {
  it('aceita serviço conhecido e localização opcional', () => {
    expect(parseUnitSearchInput({ servico: 'upa', localizacao: '  Centro ' })).toEqual({
      ok: true,
      value: { servico: 'upa', localizacao: 'Centro' },
    });
  });

  it.each([[null], ['upa'], [{}], [{ servico: 'spa' }]])('rejeita %j', (raw) => {
    expect(parseUnitSearchInput(raw).ok).toBe(false);
  });
});

describe('searchUnits', () => {
  const near: HealthUnit = {
    id: 'perto',
    name: 'UBS Pertinho',
    type: 'UBS',
    address: 'Rua A',
    coordinates: MOCK_USER_LOCATION,
    services: ['ubs', 'consulta_rotina'],
    hours: '7h-19h',
    howToAccess: 'Recepção',
  };
  const farVaccine: HealthUnit = {
    ...near,
    id: 'longe',
    name: 'UBS Longe com vacina',
    coordinates: { latitude: MOCK_USER_LOCATION.latitude + 0.1, longitude: MOCK_USER_LOCATION.longitude },
    services: ['ubs', 'vacinacao'],
  };

  it('filtra pelo serviço antes da proximidade', () => {
    const result = searchUnits([near, farVaccine], { servico: 'vacinacao', coordinates: MOCK_USER_LOCATION });
    expect(result.units.map((unit) => unit.id)).toEqual(['longe']);
    expect(result.units[0].distanceKm).toBeGreaterThan(10);
    expect(result.usedLocation).toBe(true);
  });

  it('ordena por distância e prioriza quem oferece exatamente o serviço', () => {
    const result = searchUnits([farVaccine, near], { servico: 'consulta_rotina', coordinates: MOCK_USER_LOCATION });
    expect(result.units.map((unit) => unit.id)).toEqual(['perto', 'longe']);
    expect(result.units[0].distanceKm).toBe(0);
  });

  it('sem localização: sem distâncias e explica a limitação', () => {
    const result = searchUnits(MOCK_HEALTH_UNITS, { servico: 'teleconsulta' });
    expect(result.units[0]).toMatchObject({ type: 'Serviço digital', distanceKm: null });
    expect(result.notice).toMatch(/não tenho sua localização/i);
    expect(result.notice).toContain('136');
  });

  it('nenhuma unidade encontrada é explicado na notice', () => {
    const result = searchUnits([near], { servico: 'saude_mental' });
    expect(result.units).toEqual([]);
    expect(result.notice).toMatch(/não encontrei/i);
  });

  it('limita a 3 resultados', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ ...near, id: `u${i}` }));
    expect(searchUnits(many, { servico: 'ubs' }).units).toHaveLength(3);
  });
});

describe('distanceKm', () => {
  it('1 grau de latitude ~ 111 km', () => {
    expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })).toBeCloseTo(111.2, 0);
  });
});
