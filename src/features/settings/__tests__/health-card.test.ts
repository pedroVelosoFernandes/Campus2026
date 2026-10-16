import * as SecureStore from 'expo-secure-store';

import {
  cnsDigits,
  cnsError,
  formatCns,
  HEALTH_CARD_KEY,
  isValidCns,
  maskCns,
  removeHealthCard,
  resetHealthCardStoreForTests,
  saveHealthCard,
} from '@/features/settings/health-card';

/** Monta um CNS definitivo válido a partir de um PIS de 11 dígitos (regra do Ministério da Saúde). */
function definitiveFromPis(pis: string): string {
  let sum = 0;
  for (let i = 0; i < 11; i += 1) sum += Number(pis[i]) * (15 - i);
  let dv = 11 - (sum % 11);
  if (dv === 11) dv = 0;
  if (dv === 10) {
    sum += 2;
    return `${pis}001${11 - (sum % 11)}`;
  }
  return `${pis}000${dv}`;
}

describe('Cartão SUS (CNS)', () => {
  beforeEach(() => resetHealthCardStoreForTests());

  it('aceita CNS provisórios (7, 8, 9) com soma ponderada múltipla de 11', () => {
    expect(isValidCns('898001234567891')).toBe(true);
    expect(isValidCns('898 0012 3456 7891')).toBe(true);
    expect(isValidCns('700000000000005')).toBe(true);
    expect(isValidCns('898001234567890')).toBe(false);
  });

  it('aceita CNS definitivos (1, 2) só com o verificador certo', () => {
    const cns = definitiveFromPis('12345678901');
    expect(isValidCns(cns)).toBe(true);
    const wrong = `${cns.slice(0, 14)}${(Number(cns[14]) + 1) % 10}`;
    expect(isValidCns(wrong)).toBe(false);
  });

  it('recusa tamanhos errados, letras e primeiro dígito inválido', () => {
    expect(isValidCns('89800123456789')).toBe(false);
    expect(isValidCns('8980012345678912')).toBe(false);
    expect(isValidCns('89800123456789a')).toBe(false);
    expect(isValidCns('300000000000003')).toBe(false);
    // O número fictício que estava fixo no Perfil não é um CNS válido.
    expect(isValidCns('700000000000000')).toBe(false);
  });

  it('formata, mascara e limpa o número', () => {
    expect(cnsDigits('898.0012-3456 78910000')).toBe('898001234567891');
    expect(formatCns('898001234567891')).toBe('898 0012 3456 7891');
    expect(formatCns('8980')).toBe('898 0');
    expect(maskCns('898001234567891')).toBe('••• •••• •••• 7891');
  });

  it('explica o erro do campo em linguagem simples', () => {
    expect(cnsError('898 0012')).toBe('O Cartão SUS tem 15 números.');
    expect(cnsError('898 0012 3456 7890')).toMatch(/não confere/);
    expect(cnsError('898 0012 3456 7891')).toBeNull();
  });

  it('salva só números válidos, no SecureStore, e remove', async () => {
    await expect(saveHealthCard('123')).resolves.toBe(false);
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith(HEALTH_CARD_KEY, '123', expect.anything());

    await expect(saveHealthCard('898 0012 3456 7891')).resolves.toBe(true);
    expect(await SecureStore.getItemAsync(HEALTH_CARD_KEY)).toBe('898001234567891');

    await removeHealthCard();
    expect(await SecureStore.getItemAsync(HEALTH_CARD_KEY)).toBeNull();
  });
});
