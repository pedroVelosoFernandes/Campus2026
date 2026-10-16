/**
 * Campos usados do endpoint `GET /cnes/estabelecimentos` da API de Dados
 * Abertos do Ministério da Saúde (https://apidadosabertos.saude.gov.br/v1/#/CNES).
 * Todos podem vir `null`; a normalização trata cada um.
 */
export interface CnesEstabelecimento {
  codigo_cnes: number;
  nome_fantasia: string | null;
  nome_razao_social: string | null;
  codigo_tipo_unidade: number;
  endereco_estabelecimento: string | null;
  numero_estabelecimento: string | null;
  bairro_estabelecimento: string | null;
  codigo_cep_estabelecimento: string | null;
  numero_telefone_estabelecimento: string | null;
  latitude_estabelecimento_decimo_grau: number | null;
  longitude_estabelecimento_decimo_grau: number | null;
  codigo_identificador_turno_atendimento: string | null;
  descricao_turno_atendimento: string | null;
  estabelecimento_faz_atendimento_ambulatorial_sus: string | null;
  codigo_municipio: number;
  data_atualizacao: string | null;
}
