import { Stack } from 'expo-router';

import { resolveRouteAccess, useAuth } from '@/features/auth';
import { colors } from '@/theme';

/** Onboarding (só no primeiro uso), login por celular e documentos legais. */
export default function AuthLayout() {
  const { status, onboardingDone } = useAuth();
  const access = resolveRouteAccess(status, onboardingDone);
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}>
      {/* Sem guarda: a própria tela sai quando o onboarding termina (evita REMOVE_ROUTES órfão). */}
      <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Protected guard={access.login} redirectTo={access.entry}>
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="codigo" />
      </Stack.Protected>
      <Stack.Screen name="legal" />
    </Stack>
  );
}
