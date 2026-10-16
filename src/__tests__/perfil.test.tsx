import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useEffect, type ReactElement } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Alert, Linking, type AlertButton } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AjudaScreen from '@/app/(tabs)/perfil/ajuda';
import PerfilScreen from '@/app/(tabs)/perfil/index';
import UnidadeReferenciaScreen from '@/app/(tabs)/perfil/unidade';
import { AuthProvider, createMemoryStore, createSessionClient } from '@/features/auth';
import { DEFAULT_SETTINGS, useSettings, type Settings } from '@/features/settings';
import { resetHealthCardStoreForTests } from '@/features/settings/health-card';
import { SettingsProvider } from '@/features/settings/SettingsProvider';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const METRICS = {
  frame: { x: 0, y: 0, width: 402, height: 874 },
  insets: { top: 62, left: 0, right: 0, bottom: 34 },
};

let latest: Settings = DEFAULT_SETTINGS;
const track = (settings: Settings) => {
  latest = settings;
};
function SettingsSpy() {
  const { settings } = useSettings();
  useEffect(() => track(settings), [settings]);
  return null;
}

type AccountMode = 'guest' | 'signedIn';

function authFor(mode: AccountMode) {
  const record =
    mode === 'guest'
      ? { mode: 'guest' }
      : { mode: 'demo', user: { id: 'demo', phoneMasked: '(11) •••••-4321', demo: true } };
  const sessionClient = createSessionClient({ store: createMemoryStore({ 'alo-saude.session': JSON.stringify(record) }) });
  const preferences = createMemoryStore({
    'alo-saude.onboarding': JSON.stringify({ consentVersion: 1, acceptedAt: '2026-10-01T00:00:00.000Z' }),
  });
  return { sessionClient, preferences };
}

const renderWithSettings = (ui: ReactElement, settings: Settings = DEFAULT_SETTINGS, account: AccountMode = 'guest') =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <SettingsProvider initialSettings={settings}>
        <AuthProvider {...authFor(account)}>
          {ui}
          <SettingsSpy />
        </AuthProvider>
      </SettingsProvider>
    </SafeAreaProvider>,
  );

const mockedRouter = jest.mocked(router);

beforeEach(async () => {
  jest.clearAllMocks();
  latest = DEFAULT_SETTINGS;
  resetHealthCardStoreForTests();
  await SecureStore.deleteItemAsync('alo-saude.cns');
});

describe('Perfil', () => {
  it('abre uma tela real para cada linha', async () => {
    await renderWithSettings(<PerfilScreen />);
    const routes = [
      ['Unidade de referência', '/perfil/unidade'],
      ['Notificações', '/perfil/notificacoes'],
      ['Acessibilidade', '/perfil/acessibilidade'],
      ['Privacidade e dados', '/perfil/privacidade'],
      ['Ajuda', '/perfil/ajuda'],
    ] as const;
    for (const [label, href] of routes) {
      await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${label}\\.`) }));
      expect(mockedRouter.push).toHaveBeenLastCalledWith(href);
    }
  });

  it('resume os lembretes ligados e mostra a unidade salva', async () => {
    await renderWithSettings(<PerfilScreen />, {
      ...DEFAULT_SETTINGS,
      referenceUnitId: 'ubs-vila-nova',
      notifications: { vaccineReminders: true, appointmentReminders: false, campaignAlerts: true },
    });
    expect(screen.getByText('Lembretes de vacinas e campanhas')).toBeTruthy();
    expect(screen.getByText('UBS Vila Nova')).toBeTruthy();
  });
});

describe('Perfil: conta, nome e Cartão SUS', () => {
  it('convidado vê "Entrar com celular", que abre o login', async () => {
    await renderWithSettings(<PerfilScreen />);
    expect(await screen.findByText('Você está como convidado')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar com celular' }));
    expect(mockedRouter.push).toHaveBeenCalledWith('/login');
  });

  it('logado vê o celular mascarado e sai só depois de confirmar', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderWithSettings(<PerfilScreen />, DEFAULT_SETTINGS, 'signedIn');
    expect(await screen.findByText('Conta conectada')).toBeTruthy();
    expect(screen.getByText('(11) •••••-4321')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));
    const buttons = alert.mock.calls[0][2] as AlertButton[];
    expect(buttons.map((button) => button.text)).toEqual(['Cancelar', 'Sair']);
    await act(async () => buttons[1].onPress?.());
    expect(await screen.findByText('Você está como convidado')).toBeTruthy();
  });

  it('sem nome convida a informar; o nome salvo aparece e pode ser editado', async () => {
    await renderWithSettings(<PerfilScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Como podemos te chamar?' }));
    await fireEvent.changeText(screen.getByLabelText('Seu nome'), '  Maria   Clara ');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(latest.profile).toEqual({ name: 'Maria Clara', namePromptDone: true });
    expect(screen.getByText('Maria Clara')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Editar nome' })).toBeTruthy();
  });

  it('Cartão SUS: vazio → valida → salva no SecureStore e mostra mascarado', async () => {
    await renderWithSettings(<PerfilScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: /^Adicionar Cartão SUS/ }));
    const field = screen.getByLabelText('Número do Cartão SUS');

    await fireEvent.changeText(field, '898001234567890');
    expect(screen.getByDisplayValue('898 0012 3456 7890')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByText(/não confere/)).toBeTruthy();

    await fireEvent.changeText(field, '898001234567891');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('••• •••• •••• 7891')).toBeTruthy();
    expect(await SecureStore.getItemAsync('alo-saude.cns')).toBe('898001234567891');

    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar número' }));
    expect(screen.getByText('898 0012 3456 7891')).toBeTruthy();
  });

  it('não mostra mais o cartão fictício nem nomes fixos', async () => {
    await renderWithSettings(<PerfilScreen />);
    await waitFor(() => expect(screen.getByText('Olá!')).toBeTruthy());
    expect(screen.queryByText(/Ana/)).toBeNull();
    expect(screen.queryByText('700 0000 0000 0000')).toBeNull();
  });
});

describe('Unidade de referência', () => {
  it('mostra a UBS com endereço, horário e serviços e abre a rota', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderWithSettings(<UnidadeReferenciaScreen />);

    expect(await screen.findByText('UBS do seu bairro')).toBeTruthy();
    expect(screen.getByText('Rua Principal, 200 — Centro do bairro')).toBeTruthy();
    expect(screen.getByText('Seg a sex, 7h às 18h')).toBeTruthy();
    expect(screen.getByText('Consultas de rotina')).toBeTruthy();
    expect(screen.getByText('Como funciona a consulta de rotina')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Como chegar' }));
    expect(openURL).toHaveBeenCalledWith(expect.stringContaining('-15.7955,-47.884'));
  });

  it('troca a unidade pela lista e salva a escolha', async () => {
    await renderWithSettings(<UnidadeReferenciaScreen />);
    await screen.findByText('UBS do seu bairro');

    await fireEvent.press(screen.getByRole('button', { name: 'Trocar unidade' }));
    await fireEvent.press(await screen.findByRole('button', { name: /^UBS Vila Nova/ }));

    expect(latest.referenceUnitId).toBe('ubs-vila-nova');
    expect(await screen.findByText('Av. Central, 455 — Vila Nova')).toBeTruthy();
  });
});

describe('Ajuda', () => {
  it('abre e fecha as respostas da sanfona, uma por vez', async () => {
    await renderWithSettings(<AjudaScreen />);
    const cartao = screen.getByTestId('faq-cartao-sus');
    const disque = screen.getByTestId('faq-disque-136');

    await fireEvent.press(cartao);
    expect(cartao).toBeExpanded();

    await fireEvent.press(disque);
    expect(cartao).toBeCollapsed();
    expect(disque).toBeExpanded();

    await fireEvent.press(disque);
    expect(disque).toBeCollapsed();
  });

  it('tem respostas úteis sobre o SUS e leva ao assistente', async () => {
    await renderWithSettings(<AjudaScreen />);
    // Respostas recolhidas ficam escondidas do leitor de tela.
    expect(screen.queryByText(/Cartão Nacional de Saúde \(CNS\)/)).toBeNull();
    await fireEvent.press(screen.getByTestId('faq-cartao-sus'));
    expect(screen.getByText(/Cartão Nacional de Saúde \(CNS\)/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('faq-substitui-medico'));
    expect(screen.getByText(/não faz diagnóstico/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Falar com o assistente' }));
    expect(mockedRouter.push).toHaveBeenCalledWith('/assistente');
  });
});
