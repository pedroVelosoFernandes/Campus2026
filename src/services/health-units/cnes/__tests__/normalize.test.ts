import { describeShift, normalizeEstabelecimento, toTitleCase, validCoordinates } from '@/services/health-units/cnes/normalize';

import { estabelecimento } from '../__fixtures__/cnes';

describe('normalização do CNES', () => {
  it('converte caixa alta mantendo siglas e números', () => {
    expect(toTitleCase('UNIDADE DE PRONTO ATENDIMENTO UPA II CEILANDIA')).toBe(
      'Unidade de Pronto Atendimento UPA II Ceilandia',
    );
    expect(toTitleCase('CAPS AD  SOBRADINHO')).toBe('CAPS AD Sobradinho');
  });

  it('descarta coordenadas ausentes ou fora do Brasil', () => {
    expect(validCoordinates(0, 0)).toBeNull();
    expect(validCoordinates(null, -47)).toBeNull();
    expect(validCoordinates(-15.7, -47.9)).toEqual({ latitude: -15.7, longitude: -47.9 });
  });

  it('descreve turnos em linguagem simples', () => {
    expect(describeShift('06', null)).toBe('Aberto 24 horas');
    expect(describeShift('03', null)).toMatch(/Manhã e tarde/);
    expect(describeShift(null, null)).toBe('Confirme o horário');
  });

  it('mapeia UBS para atenção básica, consulta de rotina e vacinação', () => {
    expect(normalizeEstabelecimento(estabelecimento())).toEqual({
      id: 'cnes-10707',
      name: 'UBS 1 Asa Norte',
      type: 'UBS',
      address: 'SQN 114 Area Especial — Asa Norte',
      coordinates: { latitude: -15.7733, longitude: -47.8926 },
      services: ['ubs', 'consulta_rotina', 'vacinacao'],
      hours: 'Manhã e tarde (confirme o horário)',
      phone: '(61) 3449-4826',
      howToAccess: expect.stringContaining('Cartão SUS'),
    });
  });

  it('mapeia UPA, hospital e CAPS; ignora o que não atende SUS ou tipo desconhecido', () => {
    expect(normalizeEstabelecimento(estabelecimento({ codigo_tipo_unidade: 73 }))).toMatchObject({
      type: 'UPA',
      services: ['upa', 'pronto_socorro'],
    });
    expect(normalizeEstabelecimento(estabelecimento({ codigo_tipo_unidade: 5 }))).toMatchObject({ type: 'Hospital' });
    expect(normalizeEstabelecimento(estabelecimento({ codigo_tipo_unidade: 70 }))).toMatchObject({
      services: ['saude_mental'],
    });
    const privateHospital = estabelecimento({ codigo_tipo_unidade: 5, estabelecimento_faz_atendimento_ambulatorial_sus: 'NAO' });
    expect(normalizeEstabelecimento(privateHospital)).toBeNull();
    expect(normalizeEstabelecimento(estabelecimento({ codigo_tipo_unidade: 22 }))).toBeNull();
  });
});

describe('filtro de unidades públicas', () => {
  it('UBS sem a marcação SUS entra pelo nome; clínica privada cadastrada como centro de saúde, não', () => {
    const ubs = estabelecimento({ nome_fantasia: 'UBS 13 SAMAMBAIA', estabelecimento_faz_atendimento_ambulatorial_sus: 'NAO' });
    const clinic = estabelecimento({ nome_fantasia: 'SOTTOPIEDE', estabelecimento_faz_atendimento_ambulatorial_sus: 'NAO' });
    expect(normalizeEstabelecimento(ubs)).not.toBeNull();
    expect(normalizeEstabelecimento(clinic)).toBeNull();
  });

  it('descarta telefone com dígitos a mais', () => {
    expect(normalizeEstabelecimento(estabelecimento({ numero_telefone_estabelecimento: '61334494826' }))?.phone).toBeUndefined();
    expect(normalizeEstabelecimento(estabelecimento({ numero_telefone_estabelecimento: '61991234567' }))?.phone).toBe(
      '(61) 99123-4567',
    );
  });
});
