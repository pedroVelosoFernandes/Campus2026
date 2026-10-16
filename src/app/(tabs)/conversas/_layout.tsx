import { Stack } from 'expo-router';

import { colors } from '@/theme';

/** Conversas: lista do histórico (index), chat novo (chat) e conversa salva ([id]). */
export const unstable_settings = { anchor: 'index' };

export default function ConversasLayout() {
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
