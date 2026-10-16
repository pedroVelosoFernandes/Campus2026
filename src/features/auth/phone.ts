/**
 * Celular brasileiro: máscara para digitação, normalização E.164 e versão
 * mascarada para exibição. Puro (sem React Native): usado no app e no servidor.
 */

/** Só os dígitos nacionais (DDD + número), sem o 55 e sem o 0 de operadora. */
export function nationalDigits(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length === 12 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 11);
}

/** `+55DDNNNNNNNNN` para um celular válido (DDD 11–99, 9 dígitos começando com 9), senão `null`. */
export function normalizeBrMobile(input: string): string | null {
  const raw = input.replace(/[^\d+]/g, '');
  let digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) {
    if (!digits.startsWith('55')) return null;
    digits = digits.slice(2);
  } else if (digits.length === 13 && digits.startsWith('55')) {
    digits = digits.slice(2);
  } else if (digits.length === 12 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (!/^[1-9][1-9]9\d{8}$/.test(digits)) return null;
  return `+55${digits}`;
}

/** Máscara progressiva enquanto a pessoa digita: `(11) 98765-4321`. */
export function formatBrPhone(input: string): string {
  const digits = nationalDigits(input);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 5) return `(${ddd}) ${rest}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

/** Para exibir sem expor o número inteiro: `(11) •••••-4321`. */
export function maskE164(e164: string): string {
  const digits = e164.replace(/\D/g, '').replace(/^55/, '');
  if (digits.length < 10) return '';
  return `(${digits.slice(0, 2)}) •••••-${digits.slice(-4)}`;
}

export const OTP_LENGTH = 6;
export const isOtpCode = (code: string) => new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code);
