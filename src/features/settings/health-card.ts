import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

/**
 * Cartão Nacional de Saúde (Cartão SUS) digitado pela pessoa. É um dado
 * pessoal: fica no Keychain/Keystore (expo-secure-store) e nunca sai do aparelho.
 */
export const HEALTH_CARD_KEY = 'alo-saude.cns';
export const CNS_LENGTH = 15;

/** Só os dígitos (aceita o número colado com espaços ou pontos). */
export function cnsDigits(input: string): string {
  return input.replace(/\D/g, '').slice(0, CNS_LENGTH);
}

function weightedSum(digits: string, count: number): number {
  let sum = 0;
  for (let i = 0; i < count; i += 1) sum += Number(digits[i]) * (CNS_LENGTH - i);
  return sum;
}

/** CNS definitivo (começa com 1 ou 2): dígito verificador calculado sobre o PIS. */
function isValidDefinitive(cns: string): boolean {
  const pis = cns.slice(0, 11);
  let sum = weightedSum(pis, 11);
  let dv = 11 - (sum % 11);
  if (dv === 11) dv = 0;
  if (dv === 10) {
    sum += 2;
    dv = 11 - (sum % 11);
    return cns === `${pis}001${dv}`;
  }
  return cns === `${pis}000${dv}`;
}

/**
 * Valida o CNS pela regra do Ministério da Saúde: 15 dígitos; os que começam
 * com 1 ou 2 conferem o verificador do PIS, e os provisórios (7, 8 ou 9) têm a
 * soma ponderada (pesos 15…1) múltipla de 11.
 */
export function isValidCns(input: string): boolean {
  const cns = input.replace(/\s/g, '');
  if (!/^\d{15}$/.test(cns)) return false;
  const first = cns[0];
  if (first === '1' || first === '2') return isValidDefinitive(cns);
  if (first === '7' || first === '8' || first === '9') return weightedSum(cns, CNS_LENGTH) % 11 === 0;
  return false;
}

/** Erro do campo do Cartão SUS em linguagem simples, ou `null` se o número confere. */
export function cnsError(value: string): string | null {
  const digits = cnsDigits(value);
  if (digits.length !== CNS_LENGTH) return 'O Cartão SUS tem 15 números.';
  if (!isValidCns(digits)) return 'Esse número não confere. Confira no seu cartão ou no app Meu SUS Digital.';
  return null;
}

/** "700 0000 0000 0005": o agrupamento impresso no cartão. */
export function formatCns(input: string): string {
  const d = cnsDigits(input);
  return [d.slice(0, 3), d.slice(3, 7), d.slice(7, 11), d.slice(11, 15)].filter(Boolean).join(' ');
}

/** Mostra só os 4 últimos dígitos: "••• •••• •••• 0005". */
export function maskCns(input: string): string {
  const d = cnsDigits(input);
  return `••• •••• •••• ${d.slice(-4)}`;
}

// Estado compartilhado entre as telas (um único valor, lido uma vez do SecureStore).
type CardState = { ready: boolean; cns: string | null };
let state: CardState = { ready: false, cns: null };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(next: CardState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function loadOnce(): Promise<void> {
  loading ??= SecureStore.getItemAsync(HEALTH_CARD_KEY)
    .catch(() => null)
    .then((stored) => setState({ ready: true, cns: stored && isValidCns(stored) ? stored : null }));
  return loading;
}

/** Salva um CNS válido. Devolve `false` (sem salvar) se o número não confere. */
export async function saveHealthCard(input: string): Promise<boolean> {
  const cns = cnsDigits(input);
  if (!isValidCns(cns)) return false;
  setState({ ready: true, cns });
  await SecureStore.setItemAsync(HEALTH_CARD_KEY, cns, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  }).catch(() => {
    // Sem armazenamento seguro o número vale só enquanto o app está aberto.
  });
  return true;
}

export async function removeHealthCard(): Promise<void> {
  setState({ ready: true, cns: null });
  await SecureStore.deleteItemAsync(HEALTH_CARD_KEY).catch(() => {});
}

/**
 * Esquece o valor em memória depois de "Apagar meus dados" (o armazenamento já
 * foi limpo): as telas abertas passam a mostrar "Adicionar Cartão SUS".
 */
export function resetHealthCardMemory(): void {
  loading = Promise.resolve();
  setState({ ready: true, cns: null });
}

/** Só para testes: volta ao estado antes da primeira leitura. */
export function resetHealthCardStoreForTests(): void {
  loading = null;
  setState({ ready: false, cns: null });
}

/** `{ cns, ready, save, remove }` do Cartão SUS da pessoa (`cns` só com dígitos, ou `null`). */
export function useHealthCard() {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => state);
  useEffect(() => {
    if (!snapshot.ready) void loadOnce();
  }, [snapshot.ready]);
  const save = useCallback((input: string) => saveHealthCard(input), []);
  const remove = useCallback(() => removeHealthCard(), []);
  return { cns: snapshot.cns, ready: snapshot.ready, save, remove };
}
