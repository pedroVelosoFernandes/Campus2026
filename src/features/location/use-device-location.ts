import { useCallback, useEffect, useState } from 'react';

import { locationService, type LocationService } from './location-service';
import { getManualFix, hasDeclinedLocation, markLocationDeclined, setManualFix } from './manual-place';
import type { LocationFix } from './types';

/**
 * - `checking`/`locating`: consultando permissão ou GPS;
 * - `ask`: permissão nunca pedida → mostrar a explicação antes do pedido do sistema;
 * - `ready`: há um ponto (GPS, última posição ou cidade digitada);
 * - `manual`: sem localização → pedir a cidade (o app continua funcionando).
 */
export type DeviceLocationStatus = 'checking' | 'ask' | 'locating' | 'ready' | 'manual';

export interface DeviceLocationState {
  status: DeviceLocationStatus;
  fix: LocationFix | null;
  /** A pessoa negou a permissão no sistema (pode reativar nos Ajustes). */
  denied: boolean;
  allow: () => void;
  decline: () => void;
  /** "Campinas, SP": devolve `false` se não deu para entender a cidade. */
  submitCity: (text: string) => Promise<boolean>;
  changeCity: () => void;
}

type Snapshot = Pick<DeviceLocationState, 'status' | 'fix' | 'denied'>;

const fromManual = (denied: boolean): Snapshot => {
  const fix = getManualFix();
  return fix ? { status: 'ready', fix, denied } : { status: 'manual', fix: null, denied };
};

export function useDeviceLocation(service: LocationService = locationService): DeviceLocationState {
  const [state, setState] = useState<Snapshot>({ status: 'checking', fix: null, denied: false });

  const locate = useCallback(async () => {
    setState((previous) => ({ ...previous, status: 'locating' }));
    const fix = await service.locate();
    setState(fix ? { status: 'ready', fix, denied: false } : fromManual(false));
  }, [service]);

  useEffect(() => {
    let active = true;
    service.getPermission().then((permission) => {
      if (!active) return;
      if (permission === 'granted') locate();
      else if (permission === 'undetermined' && !hasDeclinedLocation() && !getManualFix()) {
        setState({ status: 'ask', fix: null, denied: false });
      } else setState(fromManual(permission === 'denied'));
    });
    return () => {
      active = false;
    };
  }, [locate, service]);

  const allow = useCallback(() => {
    service.requestPermission().then((permission) => {
      if (permission === 'granted') locate();
      else setState(fromManual(permission === 'denied'));
    });
  }, [locate, service]);

  const decline = useCallback(() => {
    markLocationDeclined();
    setState(fromManual(false));
  }, []);

  const submitCity = useCallback(
    async (text: string) => {
      const fix = await service.fromCityText(text);
      if (!fix) return false;
      setManualFix(fix);
      setState((previous) => ({ status: 'ready', fix, denied: previous.denied }));
      return true;
    },
    [service],
  );

  const changeCity = useCallback(() => setState((previous) => ({ ...previous, status: 'manual' })), []);

  return { ...state, allow, decline, submitCity, changeCity };
}
