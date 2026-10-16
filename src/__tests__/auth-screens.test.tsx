import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import CodigoScreen from '@/app/(auth)/codigo';
import LoginScreen from '@/app/(auth)/login';
import OnboardingScreen from '@/app/(auth)/onboarding';
import { AuthProvider, createMemoryStore, createSessionClient, readOnboardingDone, useAuth } from '@/features/auth';
import { getPendingLogin } from '@/features/auth/pending-login';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: jest.fn(() => false),
  },
  Redirect: () => null,
}));

const mockedRouter = jest.mocked(router);

function setup(ui: ReactElement) {
  const preferences = createMemoryStore();
  const sessionStore = createMemoryStore();
  const sessionClient = createSessionClient({ store: sessionStore });
  let auth: ReturnType<typeof useAuth> | null = null;
  function Probe() {
    auth = useAuth();
    return null;
  }
  return {
    preferences,
    sessionClient,
    getAuth: () => auth,
    view: render(
      <GestureHandlerRootView>
        <AuthProvider preferences={preferences} sessionClient={sessionClient}>
          <Probe />
          {ui}
        </AuthProvider>
      </GestureHandlerRootView>,
    ),
  };
}

describe('Onboarding', () => {
  beforeEach(() => jest.clearAllMocks());

  it('"Pular" vai ao aceite; "Começar" só com o termo aceito e grava o onboarding', async () => {
    const { preferences, view } = setup(<OnboardingScreen />);
    await view;
    expect(screen.getByText('Converse por voz ou texto')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Pular apresentação' }));
    const start = screen.getByRole('button', { name: 'Começar' });
    expect(start.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(start);
    expect(await readOnboardingDone(preferences)).toBe(false);

    await fireEvent.press(screen.getByRole('checkbox', { name: /Li e aceito/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Começar' }));

    expect(await readOnboardingDone(preferences)).toBe(true);
    expect(mockedRouter.replace).toHaveBeenCalledWith('/login');
  });
});

describe('Login por celular', () => {
  beforeEach(() => jest.clearAllMocks());

  it('"Continuar sem entrar" vira convidado e volta às abas', async () => {
    const { getAuth, view } = setup(<LoginScreen />);
    await view;
    expect(screen.getByText('Modo demonstração')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Continuar sem entrar' }));

    expect(getAuth()?.status).toBe('guest');
    expect(mockedRouter.dismissTo).toHaveBeenCalledWith('/');
  });

  it('aplica a máscara, pede o código e abre a tela do código', async () => {
    const { view } = setup(<LoginScreen />);
    await view;
    const send = () => screen.getByRole('button', { name: 'Receber código por SMS' });
    expect(send().props.accessibilityState?.disabled).toBe(true);

    await fireEvent.changeText(screen.getByTestId('phone-input'), '11987654321');
    expect(screen.getByDisplayValue('(11) 98765-4321')).toBeTruthy();
    await fireEvent.press(send());

    expect(getPendingLogin()?.phone).toBe('(11) 98765-4321');
    expect(mockedRouter.push).toHaveBeenCalledWith('/codigo');
  });

  it('código correto (demonstração) entra; incorreto mostra erro', async () => {
    jest.useFakeTimers();
    const { getAuth, view } = setup(<CodigoScreen />);
    await view;
    expect(screen.getByText(/Reenviar código em 0:30/)).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('otp-input'), '000000');
    expect(await screen.findByText('Código incorreto.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('otp-input'), '123456');
    expect(getAuth()?.status).toBe('signedIn');
    expect(getAuth()?.user).toMatchObject({ phoneMasked: '(11) •••••-4321', demo: true });
    expect(mockedRouter.dismissTo).toHaveBeenCalledWith('/');

    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });
});
