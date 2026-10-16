import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, resolveRouteAccess, useAuth } from '@/features/auth';
import { SettingsProvider } from '@/features/settings/SettingsProvider';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  // A splash pode já ter sido escondida (ex.: fast refresh); não há o que fazer.
});

export const unstable_settings = { anchor: '(tabs)' };

/** Pilha raiz com as guardas de acesso: primeiro uso → onboarding → login → abas. */
function RootStack() {
  const { status, onboardingDone } = useAuth();
  // Enquanto a sessão salva é lida (instantes), nada de abas piscando antes do onboarding.
  if (status === 'loading') return <View style={styles.root} />;
  const access = resolveRouteAccess(status, onboardingDone);
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Protected guard={access.app} redirectTo={access.entry}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="assistente"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
      </Stack.Protected>
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SettingsProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <RootStack />
          </AuthProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
