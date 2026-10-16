import AsyncStorage from '@react-native-async-storage/async-storage';

/** Estado persistido das notificações: o que foi lido, removido e quais lembretes estão agendados. */
export type NotificationsState = {
  readIds: string[];
  dismissedIds: string[];
  /** id da notificação → id do lembrete local agendado no expo-notifications. */
  reminders: Record<string, string>;
};

export const STORAGE_KEY = '@alo-saude/notificacoes/v1';

export const EMPTY_STATE: NotificationsState = { readIds: [], dismissedIds: [], reminders: {} };

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/** Lê o estado salvo; dados ausentes ou corrompidos voltam ao estado vazio. */
export async function loadState(): Promise<NotificationsState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const data = JSON.parse(raw) as Partial<NotificationsState>;
    const reminders =
      data.reminders && typeof data.reminders === 'object' ? (data.reminders as Record<string, string>) : {};
    return {
      readIds: isStringArray(data.readIds) ? data.readIds : [],
      dismissedIds: isStringArray(data.dismissedIds) ? data.dismissedIds : [],
      reminders,
    };
  } catch {
    return EMPTY_STATE;
  }
}

export async function saveState(state: NotificationsState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Sem armazenamento o app segue funcionando; o estado só não sobrevive ao reinício.
  }
}
