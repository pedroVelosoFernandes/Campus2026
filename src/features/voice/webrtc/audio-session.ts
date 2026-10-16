import { DeviceEventEmitter, type EmitterSubscription } from 'react-native';
import InCallManager from 'react-native-incall-manager';

import type { AudioSessionLike } from './types';

/**
 * Sessão de áudio da conversa por voz (iOS/Android) com `react-native-incall-manager`:
 * - `start({ media: 'audio' })` coloca o sistema em modo chamada (eco/ruído do
 *   hardware, foco de áudio no Android);
 * - por padrão o assistente fala pelo ALTO-FALANTE (a pessoa não segura o
 *   celular no ouvido); com fone com fio conectado, devolvemos a rota ao fone;
 * - `stop()` encerra o modo chamada e libera a rota ao desligar.
 * Bluetooth: no Android o InCallManager escolhe a rota automaticamente; no iOS
 * forçar o viva-voz tem prioridade sobre o fone Bluetooth (limitação conhecida).
 */

interface WiredHeadsetEvent {
  isPlugged?: boolean;
}

export function createInCallAudioSession(manager: typeof InCallManager = InCallManager): AudioSessionLike {
  let subscription: EmitterSubscription | null = null;

  const route = (headsetPlugged: boolean) => {
    // `false` devolve a rota padrão (fone); `true` força o viva-voz.
    manager.setForceSpeakerphoneOn(!headsetPlugged);
  };

  return {
    start() {
      manager.start({ media: 'audio' });
      route(false);
      manager
        .getIsWiredHeadsetPluggedIn()
        .then(({ isWiredHeadsetPluggedIn }) => route(isWiredHeadsetPluggedIn))
        .catch(() => undefined);
      subscription = DeviceEventEmitter.addListener('WiredHeadset', (event: WiredHeadsetEvent) =>
        route(event?.isPlugged === true),
      );
    },
    stop() {
      subscription?.remove();
      subscription = null;
      manager.setForceSpeakerphoneOn(false);
      manager.stop();
    },
  };
}
