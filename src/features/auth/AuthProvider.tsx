import { router } from 'expo-router';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getSessionClient } from './api-fetch';
import { readAuthEnv } from './config';
import { createOtpClient, type OtpClient, type RequestCodeResult } from './otp-client';
import type { SessionClient } from './session-client';
import { ONBOARDING_KEY, preferencesStore, readOnboardingDone, saveOnboardingDone } from './storage';
import type { AuthStatus, AuthUser, KeyValueStore } from './types';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  onboardingDone: boolean;
  /** Sem servidor: login por SMS simulado (código 123456). */
  isDemo: boolean;
  /** Abre a tela de login (ex.: botão "Entrar" do Perfil). */
  signIn: () => void;
  requestCode: (phone: string) => Promise<RequestCodeResult>;
  /** Confere o código; em caso de sucesso a pessoa fica logada. Devolve a mensagem de erro, se houver. */
  verifyCode: (phone: string, code: string) => Promise<string | null>;
  /** Sai da conta e segue usando o app como convidado. */
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  /**
   * Volta ao primeiro uso (usado por "Apagar meus dados"): sai da conta, apaga a
   * sessão e o aceite dos termos; as guardas de rota levam ao onboarding.
   */
  resetToFirstUse: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
  /** Injeções para testes. */
  sessionClient?: SessionClient;
  otpClient?: OtpClient;
  preferences?: KeyValueStore;
}

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  onboardingDone: boolean;
}

export function AuthProvider({ children, sessionClient, otpClient, preferences = preferencesStore }: AuthProviderProps) {
  const env = useMemo(() => readAuthEnv(), []);
  const session = sessionClient ?? getSessionClient();
  const otp = useMemo(() => otpClient ?? createOtpClient({ apiUrl: env.apiUrl }), [otpClient, env.apiUrl]);
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null, onboardingDone: false });

  useEffect(() => {
    let alive = true;
    void Promise.all([readOnboardingDone(preferences), session.load()]).then(([onboardingDone, record]) => {
      if (!alive) return;
      const signedIn = (record?.mode === 'user' || record?.mode === 'demo') && !!record.user;
      const status: AuthStatus = signedIn ? 'signedIn' : record ? 'guest' : 'signedOut';
      setState({ status, user: signedIn ? (record?.user ?? null) : null, onboardingDone });
    });
    const unsubscribe = session.onExpired(() => setState((prev) => ({ ...prev, status: 'guest', user: null })));
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [session, preferences]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isDemo: !env.apiUrl,
      signIn: () => router.push('/login'),
      requestCode: (phone) => otp.requestCode(phone),
      async verifyCode(phone, code) {
        const result = await otp.verifyCode(phone, code);
        if (!result.ok) return result.error;
        await session.setSession(result.user.demo ? 'demo' : 'user', result.session, result.user);
        setState((prev) => ({ ...prev, status: 'signedIn', user: result.user }));
        return null;
      },
      async signOut() {
        await session.setSession('guest');
        setState((prev) => ({ ...prev, status: 'guest', user: null }));
      },
      async continueAsGuest() {
        if (session.current()?.mode !== 'guest') await session.setSession('guest');
        setState((prev) => ({ ...prev, status: 'guest', user: null }));
      },
      async completeOnboarding() {
        await saveOnboardingDone(preferences);
        setState((prev) => ({ ...prev, onboardingDone: true }));
      },
      async resetToFirstUse() {
        await Promise.all([session.clear(), preferences.removeItem(ONBOARDING_KEY)]);
        setState({ status: 'signedOut', user: null, onboardingDone: false });
      },
    }),
    [state, env.apiUrl, otp, session, preferences],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

/** `{ user, status, signIn, signOut, continueAsGuest, ... }` — precisa estar dentro do `AuthProvider`. */
export function useAuth(): AuthContextValue {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return value;
}
