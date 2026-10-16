import type { Coordinates, HealthUnit } from '../types';
import { CNES_TYPE_PROFILES } from './mapping';
import type { CnesEstabelecimento } from './types';

/** Siglas mantidas em maiúsculas ao converter "UBS 1 ASA NORTE" → "UBS 1 Asa Norte". */
const ACRONYMS = new Set([
  'UBS', 'UPA', 'CAPS', 'AD', 'IJ', 'SUS', 'SAMU', 'CS', 'ESF', 'USF', 'PSF', 'HRAN', 'HUB', 'HRT', 'HRC', 'HRG',
  'CAIC', 'DF', 'QD', 'QS', 'QR', 'SQS', 'SQN', 'SGAS', 'SHC', 'EQ', 'BL', 'CEP', 'CNES', 'CRAS', 'UFRJ', 'USP',
]);
const ROMAN = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XX)$/;
const LOWER = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o', 'na', 'no', 'para']);

/** Nomes e endereços do CNES vêm em CAIXA ALTA; convertemos para leitura em voz e tela. */
export function toTitleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word, index) => {
      const upper = word.toUpperCase();
      if (ACRONYMS.has(upper) || ROMAN.test(upper) || /\d/.test(word)) return upper;
      const lower = word.toLowerCase();
      if (index > 0 && LOWER.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/** O CNES usa 0 ou valores fora do Brasil quando a coordenada é desconhecida. */
export function validCoordinates(lat: unknown, lon: unknown): Coordinates | null {
  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const insideBrazil = lat >= -34 && lat <= 6 && lon >= -74.5 && lon <= -28;
  return insideBrazil ? { latitude: lat, longitude: lon } : null;
}

function formatAddress(item: CnesEstabelecimento): string | null {
  const street = item.endereco_estabelecimento?.trim();
  if (!street) return null;
  const number = item.numero_estabelecimento?.trim();
  const hasNumber = number && !/^s\/?n$/i.test(number);
  const base = toTitleCase(hasNumber ? `${street}, ${number}` : street);
  const district = item.bairro_estabelecimento?.trim();
  return district ? `${base} — ${toTitleCase(district)}` : base;
}

/** Turnos do CNES em linguagem simples (o CNES não traz horário exato). */
export function describeShift(code: string | null, description: string | null): string {
  switch (code?.trim()) {
    case '01':
      return 'Somente pela manhã (confirme o horário)';
    case '02':
      return 'Somente à tarde (confirme o horário)';
    case '03':
      return 'Manhã e tarde (confirme o horário)';
    case '04':
      return 'Manhã, tarde e noite (confirme o horário)';
    case '06':
      return 'Aberto 24 horas';
    default:
      return description ? `${toTitleCase(description).slice(0, 80)} (confirme o horário)` : 'Confirme o horário';
  }
}

function formatPhone(raw: string | null): string | undefined {
  const digits = raw?.replace(/\D/g, '') ?? '';
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  // Celular tem 9 depois do DDD; outros 11 dígitos são erro de cadastro.
  if (digits.length === 11 && digits[2] === '9') return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return undefined;
}

/** Converte um estabelecimento do CNES em `HealthUnit`; `null` se não serve ao app. */
export function normalizeEstabelecimento(item: CnesEstabelecimento): HealthUnit | null {
  const profile = CNES_TYPE_PROFILES[item.codigo_tipo_unidade];
  if (!profile) return null;
  const rawName = item.nome_fantasia?.trim() || item.nome_razao_social?.trim();
  if (!rawName) return null;
  const attendsSus = item.estabelecimento_faz_atendimento_ambulatorial_sus?.toUpperCase() === 'SIM';
  if (!attendsSus && !profile.alwaysPublic && !profile.publicName?.test(rawName)) return null;
  return {
    id: `cnes-${item.codigo_cnes}`,
    name: toTitleCase(rawName),
    type: profile.type,
    address: formatAddress(item),
    coordinates: validCoordinates(item.latitude_estabelecimento_decimo_grau, item.longitude_estabelecimento_decimo_grau),
    services: profile.services,
    hours: describeShift(item.codigo_identificador_turno_atendimento, item.descricao_turno_atendimento),
    phone: formatPhone(item.numero_telefone_estabelecimento),
    howToAccess: profile.howToAccess,
  };
}
