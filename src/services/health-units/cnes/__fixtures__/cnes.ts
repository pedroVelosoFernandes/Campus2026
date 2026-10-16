import type { CnesEstabelecimento } from '@/services/health-units/cnes/types';

export function estabelecimento(overrides: Partial<CnesEstabelecimento> = {}): CnesEstabelecimento {
  return {
    codigo_cnes: 10707,
    nome_fantasia: 'UBS 1 ASA NORTE',
    nome_razao_social: 'SECRETARIA DE SAUDE',
    codigo_tipo_unidade: 2,
    endereco_estabelecimento: 'SQN 114 AREA ESPECIAL',
    numero_estabelecimento: 'S/N',
    bairro_estabelecimento: 'ASA NORTE',
    codigo_cep_estabelecimento: '70764000',
    numero_telefone_estabelecimento: '6134494826',
    latitude_estabelecimento_decimo_grau: -15.7733,
    longitude_estabelecimento_decimo_grau: -47.8926,
    codigo_identificador_turno_atendimento: '03',
    descricao_turno_atendimento: 'ATENDIMENTOS NOS TURNOS DA MANHA E A TARDE',
    estabelecimento_faz_atendimento_ambulatorial_sus: 'SIM',
    codigo_municipio: 530010,
    data_atualizacao: '2026-02-14',
    ...overrides,
  };
}

/** Resposta da API com `count` estabelecimentos a partir do código `start`. */
export function page(count: number, start = 1, overrides: Partial<CnesEstabelecimento> = {}) {
  return {
    estabelecimentos: Array.from({ length: count }, (_, i) =>
      estabelecimento({ codigo_cnes: start + i, nome_fantasia: `UBS ${start + i}`, ...overrides }),
    ),
  };
}

export const okJson = (data: unknown) => ({ ok: true, status: 200, json: async () => data }) as Response;
