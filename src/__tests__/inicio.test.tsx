import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import InicioScreen from '@/app/(tabs)/(inicio)/index';
import { DEFAULT_SETTINGS, type Settings } from '@/features/settings';
import { SettingsProvider } from '@/features/settings/SettingsProvider';
import { markAllAsRead, resetNotificationsStore } from '@/features/notifications/store';
import { MOCK_NOTIFICATIONS } from '@/mocks/notifications';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockedRouter = jest.mocked(router);

const METRICS = {
  frame: { x: 0, y: 0, width: 402, height: 874 },
  insets: { top: 62, left: 0, right: 0, bottom: 34 },
};

const withProfile = (profile: Settings['profile']): Settings => ({ ...DEFAULT_SETTINGS, profile });

const renderWithSettings = (settings: Settings) =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <SettingsProvider initialSettings={settings}>
        <InicioScreen />
      </SettingsProvider>
    </SafeAreaProvider>,
  );

describe('Tela Início: saudação', () => {
  it('pergunta "Como podemos te chamar?" e passa a saudar pelo nome', async () => {
    await renderWithSettings(DEFAULT_SETTINGS);
    await fireEvent.press(screen.getByRole('button', { name: 'Como podemos te chamar?' }));
    await fireEvent.changeText(screen.getByLabelText('Seu nome'), 'Maria Clara');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('header', { name: 'Olá, Maria' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Como podemos te chamar?' })).toBeNull();
  });

  it('"Agora não" dispensa o convite e mantém "Olá!"', async () => {
    await renderWithSettings(DEFAULT_SETTINGS);
    await fireEvent.press(screen.getByRole('button', { name: 'Como podemos te chamar?' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Agora não' }));
    expect(screen.getByRole('header', { name: 'Olá!' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Como podemos te chamar?' })).toBeNull();
  });

  it('com nome salvo não mostra o convite', async () => {
    await renderWithSettings(withProfile({ name: 'João Pedro', namePromptDone: true }));
    expect(screen.getByRole('header', { name: 'Olá, João' })).toBeTruthy();
    expect(screen.queryByText('Como podemos te chamar?')).toBeNull();
  });
});

describe('Tela Início', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetNotificationsStore();
  });

  it('mostra saudação, título, ações e as quatro opções de cuidado', async () => {
    await renderWithSettings(DEFAULT_SETTINGS);

    expect(screen.getByText('Olá!')).toBeTruthy();
    expect(screen.queryByText(/Ana/)).toBeNull();
    expect(screen.getByText('Como podemos ajudar?')).toBeTruthy();
    expect(screen.getByText('Conte o que você precisa, por voz ou texto.')).toBeTruthy();
    expect(screen.getByText('Conversar agora')).toBeTruthy();
    expect(screen.getByText('Prefiro escrever')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Cuidar da saúde' })).toBeTruthy();
    expect(screen.queryByText('Atalhos')).toBeNull();
    for (const name of [
      'Teleconsulta. Ver opções pelo SUS',
      'Vacinação. Encontre uma unidade',
      'Estou com sintomas. Receba orientação de atendimento',
      'Consulta de rotina. Planeje seu próximo cuidado',
    ]) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });

  it('"Conversar agora" e o orbe abrem o assistente de voz', async () => {
    await renderWithSettings(DEFAULT_SETTINGS);

    await fireEvent.press(screen.getByRole('button', { name: 'Conversar agora' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Falar com o assistente por voz' }));

    expect(mockedRouter.push).toHaveBeenNthCalledWith(1, '/assistente');
    expect(mockedRouter.push).toHaveBeenNthCalledWith(2, '/assistente');
  });

  it('"Prefiro escrever" vai para Conversas', async () => {
    await renderWithSettings(DEFAULT_SETTINGS);
    await fireEvent.press(screen.getByRole('button', { name: 'Prefiro escrever' }));
    expect(mockedRouter.navigate).toHaveBeenCalledWith('/conversas/chat');
  });

  it.each([
    ['Teleconsulta', '/teleconsulta'],
    ['Vacinação', '/vacinacao'],
    ['Consulta de rotina', '/vacinacao?servico=ubs'],
  ])('a opção "%s" abre %s, como na tela de cuidados', async (title, href) => {
    await renderWithSettings(DEFAULT_SETTINGS);
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${title}\\.`) }));
    expect(mockedRouter.push).toHaveBeenCalledWith(href);
  });

  it('"Estou com sintomas" abre Conversas com o tema de sintomas', async () => {
    await renderWithSettings(DEFAULT_SETTINGS);
    await fireEvent.press(screen.getByRole('button', { name: /^Estou com sintomas/ }));
    expect(mockedRouter.navigate).toHaveBeenCalledWith('/conversas/chat?topic=sintomas');
  });

  it('o sino mostra quantas não lidas há e abre Notificações', async () => {
    await renderWithSettings(DEFAULT_SETTINGS);

    const bell = screen.getByRole('button', { name: `Notificações, ${MOCK_NOTIFICATIONS.length} não lidas` });
    expect(screen.getByTestId('notificacoes-ponto')).toBeTruthy();
    await fireEvent.press(bell);
    expect(mockedRouter.push).toHaveBeenCalledWith('/notificacoes');
  });

  it('o ponto vermelho some quando tudo foi lido', async () => {
    await renderWithSettings(DEFAULT_SETTINGS);
    await act(async () => markAllAsRead(MOCK_NOTIFICATIONS.map((item) => item.id)));

    expect(screen.queryByTestId('notificacoes-ponto')).toBeNull();
    expect(screen.getByRole('button', { name: 'Notificações' })).toBeTruthy();
  });

  it('o link discreto de emergência abre /emergencia', async () => {
    await renderWithSettings(DEFAULT_SETTINGS);
    await fireEvent.press(screen.getByRole('link', { name: /Emergência\? Ligue 192/ }));
    expect(mockedRouter.push).toHaveBeenCalledWith('/emergencia');
  });
});
