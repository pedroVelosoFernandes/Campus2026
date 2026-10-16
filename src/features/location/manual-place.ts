import type { LocationFix } from './types';

/**
 * Cidade informada pela pessoa quando não há GPS/permissão. Fica só na memória
 * desta sessão do app (não é gravada no aparelho nem enviada para análise).
 */
let manualFix: LocationFix | null = null;
let declinedThisSession = false;

export const getManualFix = (): LocationFix | null => manualFix;
export function setManualFix(fix: LocationFix | null): void {
  manualFix = fix;
}

/** A pessoa tocou "Agora não" na explicação: não insistimos de novo nesta sessão. */
export const hasDeclinedLocation = (): boolean => declinedThisSession;
export function markLocationDeclined(): void {
  declinedThisSession = true;
}

/** Só para testes. */
export function resetLocationSession(): void {
  manualFix = null;
  declinedThisSession = false;
}
