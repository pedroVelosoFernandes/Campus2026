// Mocks globais dos testes.
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated/mock'));
// O preset nativo do jest-expo resolve o inicializador .native do Reanimated 4,
// que exige o módulo nativo; nos testes ele vira um no-op.
jest.mock('react-native-reanimated/src/initializers', () => ({ initializeReanimatedModule: () => {} }));
// Armazenamentos nativos: AsyncStorage (mock oficial) e SecureStore em memória.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => void store.set(key, value)),
    deleteItemAsync: jest.fn(async (key: string) => void store.delete(key)),
  };
});
