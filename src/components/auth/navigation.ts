import { router } from 'expo-router';

/** Sai do fluxo de login: volta às abas (fecha o login aberto pelo Perfil ou substitui no primeiro uso). */
export function leaveAuthFlow() {
  router.dismissTo('/');
}

export function goBackOr(fallback: '/login' | '/onboarding') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
