import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import type { KeyValueStore } from './types';

/** Tokens e dados da pessoa: Keychain/Keystore via expo-secure-store. */
export const secureStore: KeyValueStore = {
  async getItem(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
    } catch {
      // Sem armazenamento seguro (ex.: web): a sessão vale só enquanto o app está aberto.
    }
  },
  async removeItem(key) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // nada a remover
    }
  },
};

/** Preferências não sensíveis (onboarding concluído, versão do consentimento). */
export const preferencesStore: KeyValueStore = {
  async getItem(key) {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // segue sem persistir
    }
  },
  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // nada a remover
    }
  },
};

export function createMemoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => void data.set(key, value),
    removeItem: async (key) => void data.delete(key),
  };
}

/** Versão dos termos/política aceitos. Suba quando o texto mudar para pedir novo aceite. */
export const CONSENT_VERSION = 1;
export const ONBOARDING_KEY = 'alo-saude.onboarding';

export interface OnboardingRecord {
  consentVersion: number;
  acceptedAt: string;
}

export async function readOnboardingDone(store: KeyValueStore = preferencesStore): Promise<boolean> {
  const raw = await store.getItem(ONBOARDING_KEY);
  if (!raw) return false;
  try {
    return (JSON.parse(raw) as Partial<OnboardingRecord>).consentVersion === CONSENT_VERSION;
  } catch {
    return false;
  }
}

export async function saveOnboardingDone(
  store: KeyValueStore = preferencesStore,
  now: () => Date = () => new Date(),
): Promise<void> {
  const record: OnboardingRecord = { consentVersion: CONSENT_VERSION, acceptedAt: now().toISOString() };
  await store.setItem(ONBOARDING_KEY, JSON.stringify(record));
}
