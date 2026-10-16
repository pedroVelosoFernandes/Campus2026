import {
  createMunicipalityResolver,
  normalizeName,
  placeFromText,
  toCnesMunicipalityCode,
  toUf,
} from '@/services/health-units/ibge';

const ok = (data: unknown) => ({ ok: true, status: 200, json: async () => data }) as Response;

describe('IBGE', () => {
  it('normaliza UF por sigla ou nome', () => {
    expect(toUf('df')).toBe('DF');
    expect(toUf('Distrito Federal')).toBe('DF');
    expect(toUf('São Paulo')).toBe('SP');
    expect(toUf('State of São Paulo')).toBe('SP');
    expect(toUf('Lisboa')).toBeNull();
    expect(normalizeName('  São   José dos Pinhais ')).toBe('sao jose dos pinhais');
  });

  it('entende cidade e UF em texto livre', () => {
    expect(placeFromText('Campinas, SP')).toEqual({ city: 'Campinas', uf: 'SP' });
    expect(placeFromText('Centro, Belo Horizonte - MG')).toEqual({ city: 'Belo Horizonte', uf: 'MG' });
    expect(placeFromText('perto de casa')).toBeNull();
  });

  it('converte o código IBGE de 7 dígitos no de 6 usado pelo CNES', () => {
    expect(toCnesMunicipalityCode(5300108)).toBe('530010');
    expect(toCnesMunicipalityCode('530010')).toBe('530010');
    expect(toCnesMunicipalityCode('12')).toBeNull();
  });

  it('resolve o município pelo nome sem acento e guarda a lista da UF em cache', async () => {
    const fetchImpl = jest.fn(async () => ok([{ id: 3509502, nome: 'Campinas' }, { id: 3548708, nome: 'São Bernardo do Campo' }]));
    const resolve = createMunicipalityResolver({ fetchImpl });
    await expect(resolve({ city: 'sao bernardo do campo', uf: 'São Paulo' })).resolves.toEqual({
      code: '354870',
      name: 'São Bernardo do Campo',
      uf: 'SP',
    });
    await expect(resolve({ city: 'Campinas', uf: 'SP' })).resolves.toMatchObject({ code: '350950' });
    await expect(resolve({ city: 'Atlântida', uf: 'SP' })).resolves.toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]).toEqual([
      'https://servicodados.ibge.gov.br/api/v1/localidades/estados/SP/municipios',
      expect.anything(),
    ]);
  });

  it('capitais e o DF (município único) resolvem sem rede', async () => {
    const fetchImpl = jest.fn();
    const resolve = createMunicipalityResolver({ fetchImpl });
    await expect(resolve({ city: 'São Paulo', uf: 'SP' })).resolves.toEqual({ code: '355030', name: 'São Paulo', uf: 'SP' });
    await expect(resolve({ city: 'Ceilândia', uf: 'Distrito Federal' })).resolves.toMatchObject({ code: '530010' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('usa o código IBGE informado sem chamar a API', async () => {
    const fetchImpl = jest.fn();
    const resolve = createMunicipalityResolver({ fetchImpl });
    await expect(resolve({ ibgeCode: '5300108', uf: 'DF', city: 'Brasília' })).resolves.toMatchObject({ code: '530010' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
