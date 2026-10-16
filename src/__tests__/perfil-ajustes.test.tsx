import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, type ReactElement } from 'react';
import { Alert, type AlertButton } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AcessibilidadeScreen from '@/app/(tabs)/perfil/acessibilidade';
import NotificacoesScreen from '@/app/(tabs)/perfil/notificacoes';
import PrivacidadeScreen from '@/app/(tabs)/perfil/privacidade';
import { AuthProvider, createMemoryStore, createSessionClient, useAuth, type AuthContextValue } from '@/features/auth';
import { DEFAULT_SETTINGS, useSettings, type Settings } from '@/features/settings';
import { saveHealthCard, useHealthCard } from '@/features/settings/health-card';
import { SettingsProvider } from '@/features/settings/SettingsProvider';
import { eraseMyData, PRIVACY_POLICY_URL, shareMyData } from '@/features/privacy';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(async () => undefined) }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({ type: 'opened' })) }));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ status: 'undetermined' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
}));
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'undetermined' })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
}));
jest.mock('@/features/privacy/data', () => ({
  ...jest.requireActual('@/features/privacy/data'),
  shareMyData: jest.fn(async () => true),
  eraseMyData: jest.fn(async () => undefined),
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 402, height: 874 },
  insets: { top: 62, left: 0, right: 0, bottom: 34 },
};

let latest: Settings = DEFAULT_SETTINGS;
const track = (settings: Settings) => {
  latest = settings;
};
let auth: AuthContextValue | null = null;
let card: string | null = null;
const trackAuth = (value: AuthContextValue, cns: string | null) => {
  auth = value;
  card = cns;
};
function SettingsSpy() {
  const { settings } = useSettings();
  const authValue = useAuth();
  const { cns } = useHealthCard();
  useEffect(() => track(settings), [settings]);
  useEffect(() => trackAuth(authValue, cns), [authValue, cns]);
  return null;
}

/** Pessoa logada (modo demonstração) que já passou pelo onboarding. */
function signedInAuth() {
  const sessionStore = createMemoryStore({
    'alo-saude.session': JSON.stringify({ mode: 'demo', user: { id: 'demo', phoneMasked: '(11) •••••-4321', demo: true } }),
  });
  const preferences = createMemoryStore({
    'alo-saude.onboarding': JSON.stringify({ consentVersion: 1, acceptedAt: '2026-10-01T00:00:00.000Z' }),
  });
  return { sessionClient: createSessionClient({ store: sessionStore }), preferences };
}

const renderWithSettings = (ui: ReactElement, settings: Settings = DEFAULT_SETTINGS) =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <SettingsProvider initialSettings={settings}>
        <AuthProvider {...signedInAuth()}>
          {ui}
          <SettingsSpy />
        </AuthProvider>
      </SettingsProvider>
    </SafeAreaProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  latest = DEFAULT_SETTINGS;
});

describe('Notificações', () => {
  it('liga e desliga cada lembrete e pede permissão ao ligar', async () => {
    await renderWithSettings(<NotificacoesScreen />);
    const campaigns = screen.getByRole('switch', { name: 'Campanhas de saúde' });
    expect(campaigns).not.toBeChecked();

    await fireEvent.press(campaigns);
    expect(latest.notifications.campaignAlerts).toBe(true);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('switch', { name: 'Lembretes de vacinas' }));
    expect(latest.notifications.vaccineReminders).toBe(false);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('avisa quando as notificações estão bloqueadas no aparelho', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ status: 'denied' } as never);
    await renderWithSettings(<NotificacoesScreen />);
    expect(await screen.findByText('Notificações bloqueadas no aparelho')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Abrir Ajustes' })).toBeTruthy();
  });
});

describe('Acessibilidade', () => {
  it('aumenta e diminui o texto com prévia ao vivo', async () => {
    await renderWithSettings(<AcessibilidadeScreen />);
    expect(screen.getByTestId('font-scale-slider')).toHaveAccessibilityValue({ text: 'Padrão' });

    await fireEvent.press(screen.getByRole('button', { name: 'Aumentar texto' }));
    expect(latest.accessibility.fontScale).toBe(1.15);
    expect(screen.getByTestId('font-scale-slider')).toHaveAccessibilityValue({ text: 'Médio' });
    expect(screen.getByText('Vacina da gripe')).toHaveStyle({ fontSize: 21 });

    await fireEvent.press(screen.getByTestId('font-scale-1.45'));
    expect(latest.accessibility.fontScale).toBe(1.45);
    expect(screen.getByRole('button', { name: 'Aumentar texto' })).toBeDisabled();

    await fireEvent.press(screen.getByRole('button', { name: 'Diminuir texto' }));
    expect(latest.accessibility.fontScale).toBe(1.3);
  });

  it('responde às ações do VoiceOver no ajuste deslizante', async () => {
    await renderWithSettings(<AcessibilidadeScreen />);
    const slider = screen.getByTestId('font-scale-slider');
    await act(async () => slider.props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } }));
    expect(latest.accessibility.fontScale).toBe(0.9);
  });

  it('guarda alto contraste, leitura em voz alta e reduzir animações', async () => {
    await renderWithSettings(<AcessibilidadeScreen />);
    await fireEvent.press(screen.getByRole('switch', { name: 'Alto contraste' }));
    await fireEvent.press(screen.getByRole('switch', { name: 'Ler respostas em voz alta' }));
    await fireEvent.press(screen.getByRole('switch', { name: 'Reduzir animações' }));
    expect(latest.accessibility).toMatchObject({ highContrast: true, readAloud: true, reduceMotion: true });
  });
});

describe('Privacidade e dados', () => {
  it('mantém o histórico de conversas desligado por padrão', async () => {
    await renderWithSettings(<PrivacidadeScreen />);
    expect(screen.getByRole('switch', { name: 'Salvar histórico de conversas' })).not.toBeChecked();
    await fireEvent.press(screen.getByRole('switch', { name: 'Salvar histórico de conversas' }));
    expect(latest.privacy.saveConversationHistory).toBe(true);
  });

  it('só liga a localização se o aparelho permitir', async () => {
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({ status: 'denied' } as never);
    await renderWithSettings(<PrivacidadeScreen />);
    await fireEvent.press(screen.getByRole('switch', { name: 'Usar minha localização' }));
    await waitFor(() => expect(screen.getByText('Localização bloqueada no aparelho')).toBeTruthy());
    expect(latest.privacy.useLocation).toBe(false);

    await fireEvent.press(screen.getByRole('switch', { name: 'Usar minha localização' }));
    await waitFor(() => expect(latest.privacy.useLocation).toBe(true));
  });

  it('exporta os dados e abre a política de privacidade', async () => {
    await renderWithSettings(<PrivacidadeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /^Baixar meus dados/ }));
    expect(shareMyData).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('link', { name: 'Política de privacidade' }));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
  });

  it('pede confirmação antes de apagar e volta ao primeiro uso', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await saveHealthCard('898 0012 3456 7891');
    await renderWithSettings(<PrivacidadeScreen />, {
      ...DEFAULT_SETTINGS,
      profile: { name: 'Maria', namePromptDone: true },
      accessibility: { ...DEFAULT_SETTINGS.accessibility, fontScale: 1.45, highContrast: true },
      privacy: { saveConversationHistory: true, useLocation: false },
    });
    await waitFor(() => expect(auth?.status).toBe('signedIn'));
    expect(card).toBe('898001234567891');

    await fireEvent.press(screen.getByRole('button', { name: /^Apagar meus dados/ }));
    expect(eraseMyData).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0][2] as AlertButton[];
    expect(buttons.map((button) => button.text)).toEqual(['Cancelar', 'Apagar']);

    await act(async () => buttons[1].onPress?.());
    expect(eraseMyData).toHaveBeenCalled();
    expect(latest).toEqual(DEFAULT_SETTINGS);
    // Saiu da conta e voltou ao onboarding; o Cartão SUS em memória foi esquecido.
    expect(auth).toMatchObject({ status: 'signedOut', user: null, onboardingDone: false });
    expect(card).toBeNull();
    expect(alert).toHaveBeenLastCalledWith('Dados apagados', expect.any(String));
  });
});
