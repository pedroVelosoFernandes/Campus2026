import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Share } from 'react-native';

import { HEALTH_CARD_KEY } from '@/features/settings/health-card';

/**
 * Chaves do SecureStore criadas pelo app (o SecureStore não lista chaves).
 * Quem gravar algo lá deve registrar a chave para que "Apagar meus dados"
 * consiga removê-la.
 */
const secureStoreKeys = new Set<string>([
  // Sessão de login (src/features/auth/session-client.ts → SESSION_KEY).
  'alo-saude.session',
  // Cartão SUS digitado no Perfil.
  HEALTH_CARD_KEY,
]);

export function registerSecureStoreKey(key: string): void {
  secureStoreKeys.add(key);
}

export function registeredSecureStoreKeys(): string[] {
  return [...secureStoreKeys];
}

export type DataExport = {
  app: 'Alô Saúde';
  geradoEm: string;
  observacao: string;
  dados: Record<string, unknown>;
};

function parseValue(value: string | null): unknown {
  if (value === null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Reúne tudo o que o app guarda no aparelho (AsyncStorage). Credenciais do
 * SecureStore ficam de fora de propósito: não devem circular em um arquivo.
 */
export async function collectMyData(now: Date = new Date()): Promise<DataExport> {
  const keys = await AsyncStorage.getAllKeys();
  const pairs = keys.length ? await AsyncStorage.multiGet(keys) : [];
  const dados = Object.fromEntries(pairs.map(([key, value]) => [key, parseValue(value)]));
  return {
    app: 'Alô Saúde',
    geradoEm: now.toISOString(),
    observacao:
      'Estes são os dados que o Alô Saúde guarda neste aparelho. Conversas só aparecem aqui ' +
      'se você permitiu salvar o histórico. Credenciais de acesso não são exportadas.',
    dados,
  };
}

/** Abre a folha de compartilhamento do sistema com os dados em JSON. */
export async function shareMyData(): Promise<boolean> {
  const data = await collectMyData();
  const result = await Share.share({
    title: 'Meus dados — Alô Saúde',
    message: JSON.stringify(data, null, 2),
  });
  return result.action === Share.sharedAction;
}

/** Remove todos os dados do app: AsyncStorage inteiro e as chaves registradas do SecureStore. */
export async function eraseMyData(): Promise<void> {
  await AsyncStorage.clear();
  await Promise.all(
    registeredSecureStoreKeys().map((key) => SecureStore.deleteItemAsync(key).catch(() => undefined)),
  );
}
