import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unknown';

type PermissionApi = {
  get: () => Promise<{ status: string }>;
  request: () => Promise<{ status: string }>;
};

const toState = (status: string): PermissionState =>
  status === 'granted' || status === 'denied' || status === 'undetermined' ? status : 'unknown';

function usePermission(api: PermissionApi) {
  const [state, setState] = useState<PermissionState>('unknown');

  useEffect(() => {
    let active = true;
    api
      .get()
      .then(({ status }) => {
        if (active) setState(toState(status));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [api]);

  /** Pede a permissão (se ainda não foi negada) e diz se ficou concedida. */
  const request = useCallback(async () => {
    try {
      const { status } = await api.request();
      setState(toState(status));
      return status === 'granted';
    } catch {
      return false;
    }
  }, [api]);

  return { state, request };
}

const NOTIFICATIONS: PermissionApi = {
  get: () => Notifications.getPermissionsAsync(),
  request: () => Notifications.requestPermissionsAsync(),
};

const LOCATION: PermissionApi = {
  get: () => Location.getForegroundPermissionsAsync(),
  request: () => Location.requestForegroundPermissionsAsync(),
};

/** Permissão de notificações do sistema (os lembretes só funcionam com ela). */
export function useNotificationPermission() {
  return usePermission(NOTIFICATIONS);
}

/** Permissão de localização "enquanto o app está em uso". */
export function useLocationPermission() {
  return usePermission(LOCATION);
}
