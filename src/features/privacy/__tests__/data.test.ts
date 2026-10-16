import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Share } from 'react-native';

import { collectMyData, eraseMyData, registerSecureStoreKey, shareMyData } from '@/features/privacy';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-secure-store', () => ({ deleteItemAsync: jest.fn(async () => undefined) }));

describe('dados da pessoa (LGPD)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem('@alo-saude/settings', JSON.stringify({ version: 1 }));
    await AsyncStorage.setItem('texto-simples', 'olá');
  });

  it('exporta tudo o que o app guarda, decodificando JSON', async () => {
    const data = await collectMyData(new Date('2026-10-16T12:00:00Z'));
    expect(data.geradoEm).toBe('2026-10-16T12:00:00.000Z');
    expect(data.dados).toEqual({ '@alo-saude/settings': { version: 1 }, 'texto-simples': 'olá' });
  });

  it('abre a folha de compartilhamento com o JSON', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
    await expect(shareMyData()).resolves.toBe(true);
    const message = share.mock.calls[0][0] as { message: string };
    expect(JSON.parse(message.message).dados['texto-simples']).toBe('olá');
  });

  it('apaga o AsyncStorage e as chaves registradas do SecureStore', async () => {
    registerSecureStoreKey('outra-chave');
    await eraseMyData();
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('alo-saude.session');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('outra-chave');
  });
});
