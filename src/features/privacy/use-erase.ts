import { useCallback } from 'react';

import { useAuth } from '@/features/auth';
import { clearConversations } from '@/features/history';
import { resetNotificationsStore } from '@/features/notifications/store';
import { useSettings } from '@/features/settings';
import { resetHealthCardMemory } from '@/features/settings/health-card';

import { eraseMyData } from './data';

/**
 * "Apagar meus dados": remove tudo do aparelho e também o que está em memória.
 * Preferências voltam ao padrão, a conta sai, o Cartão SUS, as conversas e as
 * notificações lidas são esquecidos, e o app volta ao primeiro uso (onboarding).
 */
export function useEraseMyData(): () => Promise<void> {
  const { reset } = useSettings();
  const { resetToFirstUse } = useAuth();
  return useCallback(async () => {
    await eraseMyData();
    reset();
    resetHealthCardMemory();
    // Conversas salvas: esvazia a lista em memória (o disco já foi limpo).
    clearConversations();
    resetNotificationsStore();
    await resetToFirstUse();
  }, [reset, resetToFirstUse]);
}
