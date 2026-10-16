import { Stack } from 'expo-router';

import { colors } from '@/theme';

export const unstable_settings = { anchor: 'index' };

export default function PerfilLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
