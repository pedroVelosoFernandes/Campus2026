import type { AuthStatus } from './types';

export interface RouteAccess {
  /** Abas e assistente: depois do onboarding e da escolha (conta ou convidado). */
  app: boolean;
  /** Onboarding só no primeiro uso. */
  onboarding: boolean;
  /** Login/código: depois do onboarding (convidados podem abrir pelo Perfil). */
  login: boolean;
  /** Para onde vai quem cai numa tela bloqueada (`redirectTo` das guardas). */
  entry: '/onboarding' | '/login' | '/';
}

/**
 * Guardas das rotas (`<Stack.Protected>`): primeiro uso → onboarding → login → abas;
 * quem já escolheu vai direto às abas. O expo-router redireciona sozinho para a
 * primeira tela disponível quando uma guarda muda.
 */
export function resolveRouteAccess(status: AuthStatus, onboardingDone: boolean): RouteAccess {
  const app = onboardingDone && (status === 'guest' || status === 'signedIn');
  return {
    app,
    onboarding: !onboardingDone,
    login: onboardingDone,
    entry: !onboardingDone ? '/onboarding' : app ? '/' : '/login',
  };
}
