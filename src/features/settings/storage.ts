import AsyncStorage from '@react-native-async-storage/async-storage';

import { sanitizeSettings } from './logic';
import { DEFAULT_SETTINGS, type Settings } from './types';

/** Prefixo de todas as chaves do app no AsyncStorage. */
export const STORAGE_PREFIX = '@alo-saude/';
export const SETTINGS_KEY = `${STORAGE_PREFIX}settings`;

/** Lê as preferências salvas; qualquer falha devolve o padrão. */
export async function loadSettings(): Promise<Settings> {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    return sanitizeSettings(JSON.parse(stored));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
