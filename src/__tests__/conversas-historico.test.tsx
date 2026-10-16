import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { Alert } from 'react-native';

import ConversaSalvaScreen from '@/app/(tabs)/conversas/[id]';
import ConversaChatScreen from '@/app/(tabs)/conversas/chat';
import ConversasScreen from '@/app/(tabs)/conversas/index';
import { HISTORY_KEY, resetHistoryStore, type SavedConversation } from '@/features/history';
import { DEFAULT_SETTINGS, type Settings } from '@/features/settings';
import { SettingsProvider } from '@/features/settings/SettingsProvider';
import { useTextAssistant, type TextAssistant } from '@/features/voice';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    setParams: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: jest.fn(() => ({})),
  useIsFocused: jest.fn(() => true),
}));
jest.mock('@/features/voice', () => ({
  useTextAssistant: jest.fn(),
  createVoiceDependencies: jest.fn(() => ({ mode: 'mock' })),
}));

const mockedRouter = jest.mocked(router);
const mockedParams = jest.mocked(useLocalSearchParams);
const mockedHook = jest.mocked(useTextAssistant);

const SAVED: SavedConversation = {
  id: 'conv_1',
  channel: 'texto',
  title: 'Estou com dor de garganta desde ontem',
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [
    { role: 'user', text: 'Estou com dor de garganta desde ontem.' },
    { role: 'assistant', text: 'Procure a UBS se piorar.' },
  ],
  outcome: { kind: 'cuidar-saude', label: 'Ver opções de atendimento' },
};

const VOICE: SavedConversation = {
  ...SAVED,
  id: 'conv_2',
  channel: 'voz',
  title: 'Quero colocar minhas vacinas em dia',
  updatedAt: new Date(Date.now() - 1000).toISOString(),
  outcome: { kind: 'cuidar-saude', label: 'Ligue 192 (SAMU) agora', emergency: true },
};

const withHistory = (on: boolean): Settings => ({
  ...DEFAULT_SETTINGS,
  privacy: { ...DEFAULT_SETTINGS.privacy, saveConversationHistory: on },
});

async function renderWith(ui: ReactElement, on = true) {
  await render(<SettingsProvider initialSettings={withHistory(on)}>{ui}</SettingsProvider>);
  await act(async () => {}); // hidratação do AsyncStorage
}

function assistant(overrides: Partial<TextAssistant> = {}): TextAssistant {
  return {
    state: 'idle',
    transcript: [],
    error: null,
    suggestedAction: null,
    mode: 'mock',
    sendMessage: jest.fn(async () => {}),
    start: jest.fn(async () => {}),
    stop: jest.fn(),
    ...overrides,
  };
}

describe('Aba Conversas (histórico)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    resetHistoryStore();
    await AsyncStorage.clear();
    mockedParams.mockReturnValue({});
    mockedHook.mockReturnValue(assistant());
  });

  it('com o histórico desligado explica e leva a Privacidade', async () => {
    await renderWith(<ConversasScreen />, false);

    expect(screen.getByRole('header', { name: 'Conversas' })).toBeTruthy();
    expect(screen.getByTestId('conversas-historico-desligado')).toBeTruthy();
    expect(screen.getByText('O histórico está desligado')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Ativar em Privacidade' }));
    expect(mockedRouter.navigate).toHaveBeenCalledWith('/perfil/privacidade');
  });

  it('com o histórico ligado e vazio mostra que as próximas aparecem aqui', async () => {
    await renderWith(<ConversasScreen />, true);
    expect(screen.getByTestId('conversas-vazio')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ativar em Privacidade' })).toBeNull();
  });

  it('"Nova conversa" abre o chat', async () => {
    await renderWith(<ConversasScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Nova conversa' }));
    expect(mockedRouter.push).toHaveBeenCalledWith('/conversas/chat');
  });

  it('lista as conversas salvas, mais recentes primeiro, e abre a escolhida', async () => {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([VOICE, SAVED]));
    await renderWith(<ConversasScreen />);

    const rows = screen.getAllByTestId(/^conversa-conv_/);
    expect(rows.map((row) => row.props.testID)).toEqual(['conversa-conv_1', 'conversa-conv_2']);
    expect(screen.getByText(/Por voz/)).toBeTruthy();
    expect(screen.getByText('Ver opções de atendimento')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: /^Estou com dor de garganta/ }));
    expect(mockedRouter.push).toHaveBeenCalledWith({ pathname: '/conversas/[id]', params: { id: 'conv_1' } });
  });

  it('com conversas salvas e histórico desligado avisa que novas não são salvas', async () => {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([SAVED]));
    await renderWith(<ConversasScreen />, false);
    expect(screen.getByText('Histórico desligado')).toBeTruthy();
    expect(screen.getByTestId('conversa-conv_1')).toBeTruthy();
  });

  it('"Apagar todas" pede confirmação e limpa o histórico', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.[1]?.onPress?.());
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([SAVED, VOICE]));
    await renderWith(<ConversasScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Apagar todas as conversas' }));
    await act(async () => {});

    expect(alert).toHaveBeenCalled();
    expect(screen.getByTestId('conversas-vazio')).toBeTruthy();
    expect(await AsyncStorage.getItem(HISTORY_KEY)).toBeNull();
  });

  it('links com ?topic=sintomas abrem um chat novo direto', async () => {
    mockedParams.mockReturnValue({ topic: 'sintomas' });
    await renderWith(<ConversasScreen />);
    expect(mockedRouter.push).toHaveBeenCalledWith({ pathname: '/conversas/chat', params: { topic: 'sintomas' } });
    expect(mockedRouter.setParams).toHaveBeenCalledWith({ topic: undefined, nova: undefined });
  });

  it('links com ?nova=1 abrem um chat novo direto', async () => {
    mockedParams.mockReturnValue({ nova: '1' });
    await renderWith(<ConversasScreen />);
    expect(mockedRouter.push).toHaveBeenCalledWith({ pathname: '/conversas/chat', params: {} });
  });
});

describe('Conversa salva (somente leitura)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    resetHistoryStore();
    await AsyncStorage.clear();
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([SAVED, VOICE]));
    mockedHook.mockReturnValue(assistant());
  });

  it('mostra as falas sem campo de mensagem e oferece "Continuar conversa"', async () => {
    mockedParams.mockReturnValue({ id: 'conv_1' });
    await renderWith(<ConversaSalvaScreen />);

    expect(screen.getByText('Procure a UBS se piorar.')).toBeTruthy();
    expect(screen.getByText(/Somente leitura/)).toBeTruthy();
    expect(screen.queryByPlaceholderText('Escreva ou envie um áudio')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Continuar conversa' }));
    expect(mockedRouter.replace).toHaveBeenCalledWith({ pathname: '/conversas/chat', params: { continuar: 'conv_1' } });
  });

  it('emergência salva mantém o 192 e leva aos outros contatos', async () => {
    mockedParams.mockReturnValue({ id: 'conv_2' });
    await renderWith(<ConversaSalvaScreen />);

    expect(screen.getByRole('button', { name: 'Ligar 192 (SAMU)' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Ver outros contatos de emergência' }));
    expect(mockedRouter.push).toHaveBeenCalledWith('/emergencia');
  });

  it('apagar remove do aparelho e volta', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.[1]?.onPress?.());
    mockedParams.mockReturnValue({ id: 'conv_1' });
    await renderWith(<ConversaSalvaScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Apagar conversa' }));
    await act(async () => {});
    const list = JSON.parse((await AsyncStorage.getItem(HISTORY_KEY)) ?? '[]');
    expect(list.map((item: SavedConversation) => item.id)).toEqual(['conv_2']);
    expect(mockedRouter.back).toHaveBeenCalled();
  });

  it('id desconhecido mostra que a conversa não existe', async () => {
    mockedParams.mockReturnValue({ id: 'nao-existe' });
    await renderWith(<ConversaSalvaScreen />);
    expect(screen.getByText('Conversa não encontrada')).toBeTruthy();
  });

  it('continuar mostra as falas anteriores e o divisor, sem a saudação', async () => {
    mockedParams.mockReturnValue({ continuar: 'conv_1' });
    await renderWith(<ConversaChatScreen />);

    expect(screen.getByText('Procure a UBS se piorar.')).toBeTruthy();
    expect(screen.getByText('Conversa retomada')).toBeTruthy();
    expect(screen.queryByText('Olá! Como posso ajudar você hoje?')).toBeNull();
    expect(screen.getByPlaceholderText('Escreva ou envie um áudio')).toBeTruthy();
  });
});
