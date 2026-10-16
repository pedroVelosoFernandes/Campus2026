import { DeviceEventEmitter } from 'react-native';
import InCallManager from 'react-native-incall-manager';

import { createInCallAudioSession } from '@/features/voice/webrtc/audio-session';

jest.mock('react-native-incall-manager', () => ({
  __esModule: true,
  default: {
    start: jest.fn(),
    stop: jest.fn(),
    setForceSpeakerphoneOn: jest.fn(),
    getIsWiredHeadsetPluggedIn: jest.fn(async () => ({ isWiredHeadsetPluggedIn: false })),
  },
}));

const manager = jest.mocked(InCallManager);
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('sessão de áudio (viva-voz) da conversa por voz', () => {
  beforeEach(() => jest.clearAllMocks());

  it('liga em modo áudio no alto-falante e desliga ao encerrar', async () => {
    const session = createInCallAudioSession();
    session.start();
    await flush();
    expect(manager.start).toHaveBeenCalledWith({ media: 'audio' });
    expect(manager.setForceSpeakerphoneOn).toHaveBeenLastCalledWith(true);

    session.stop();
    expect(manager.setForceSpeakerphoneOn).toHaveBeenLastCalledWith(false);
    expect(manager.stop).toHaveBeenCalled();
  });

  it('com fone com fio, devolve a rota ao fone e volta ao viva-voz quando ele sai', async () => {
    manager.getIsWiredHeadsetPluggedIn.mockResolvedValueOnce({ isWiredHeadsetPluggedIn: true });
    const session = createInCallAudioSession();
    session.start();
    await flush();
    expect(manager.setForceSpeakerphoneOn).toHaveBeenLastCalledWith(false);

    DeviceEventEmitter.emit('WiredHeadset', { isPlugged: false });
    expect(manager.setForceSpeakerphoneOn).toHaveBeenLastCalledWith(true);
    session.stop();
    DeviceEventEmitter.emit('WiredHeadset', { isPlugged: false });
    expect(manager.setForceSpeakerphoneOn).toHaveBeenLastCalledWith(false);
  });
});
