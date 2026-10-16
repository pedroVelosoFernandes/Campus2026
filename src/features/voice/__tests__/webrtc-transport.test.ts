import type { WebRTCModule } from '@/features/voice/webrtc/types';
import {
  fetchClientSecret,
  OPENAI_REALTIME_CALLS_URL,
  REALTIME_DATA_CHANNEL,
  createWebRTCTransport,
} from '@/features/voice/webrtc/webrtc-transport';

jest.mock('react-native-webrtc', () => ({ RTCPeerConnection: jest.fn(), mediaDevices: {} }));

type Listener = (event: { data: unknown }) => void;

function createFakeWebRTC() {
  const listeners: Record<string, Listener[]> = {};
  const channel = {
    readyState: 'connecting',
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: (type: string, listener: Listener) => {
      (listeners[type] ??= []).push(listener);
    },
    emit(type: string, event: { data: unknown } = { data: null }) {
      if (type === 'open') channel.readyState = 'open';
      listeners[type]?.forEach((listener) => listener(event));
    },
  };
  const track = { enabled: true, stop: jest.fn() };
  const stream = { getAudioTracks: () => [track], getTracks: () => [track] };
  const pc = {
    connectionState: 'new',
    createDataChannel: jest.fn(() => channel),
    addTrack: jest.fn(),
    addTransceiver: jest.fn(),
    createOffer: jest.fn(async () => ({ type: 'offer', sdp: 'v=0 offer' })),
    setLocalDescription: jest.fn(async () => {}),
    setRemoteDescription: jest.fn(async () => {
      setTimeout(() => channel.emit('open'), 0);
    }),
    addEventListener: jest.fn(),
    close: jest.fn(),
  };
  const webrtc: WebRTCModule = {
    createPeerConnection: () => pc,
    getUserMedia: async () => stream,
    attachRemoteAudio: () => () => {},
  };
  return { webrtc, pc, channel, track };
}

const handlers = () => ({ onEvent: jest.fn(), onError: jest.fn(), onClose: jest.fn() });

describe('createWebRTCTransport', () => {
  it('faz o handshake SDP com o client secret efêmero e abre o canal oai-events', async () => {
    const fake = createFakeWebRTC();
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 201, text: async () => 'v=0 answer' });
    const transport = createWebRTCTransport({
      getClientSecret: async () => 'ek_abc',
      webrtc: fake.webrtc,
      fetchImpl,
    });
    const h = handlers();

    await transport.connect(h);

    expect(fake.pc.createDataChannel).toHaveBeenCalledWith(REALTIME_DATA_CHANNEL);
    expect(fake.pc.addTrack).toHaveBeenCalled();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(OPENAI_REALTIME_CALLS_URL);
    expect(init).toMatchObject({
      method: 'POST',
      body: 'v=0 offer',
      headers: { Authorization: 'Bearer ek_abc', 'Content-Type': 'application/sdp' },
    });
    expect(fake.pc.setRemoteDescription).toHaveBeenCalledWith({ type: 'answer', sdp: 'v=0 answer' });

    fake.channel.emit('message', { data: JSON.stringify({ type: 'session.created' }) });
    fake.channel.emit('message', { data: 'lixo' });
    expect(h.onEvent).toHaveBeenCalledTimes(1);
    expect(h.onEvent).toHaveBeenCalledWith({ type: 'session.created' });

    transport.send({ type: 'response.create' });
    expect(fake.channel.send).toHaveBeenCalledWith('{"type":"response.create"}');

    transport.setMuted(true);
    expect(fake.track.enabled).toBe(false);

    transport.disconnect();
    expect(fake.track.stop).toHaveBeenCalled();
    expect(fake.pc.close).toHaveBeenCalled();
  });

  it('libera recursos e propaga o erro quando a negociação falha', async () => {
    const fake = createFakeWebRTC();
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 401, text: async () => '' });
    const transport = createWebRTCTransport({ getClientSecret: async () => 'ek', webrtc: fake.webrtc, fetchImpl });
    await expect(transport.connect(handlers())).rejects.toThrow('401');
    expect(fake.pc.close).toHaveBeenCalled();
    expect(fake.track.stop).toHaveBeenCalled();
  });
});

describe('fetchClientSecret', () => {
  it('lê o clientSecret da rota do nosso servidor', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ clientSecret: 'ek_1' }) });
    await expect(fetchClientSecret('https://api.exemplo/', fetchImpl)).resolves.toBe('ek_1');
    expect(fetchImpl).toHaveBeenCalledWith('https://api.exemplo/api/realtime-session', { method: 'POST' });
  });

  it('erro quando o servidor falha', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchClientSecret('https://api.exemplo', fetchImpl)).rejects.toThrow('500');
  });
});

describe('createWebRTCTransport no modo texto', () => {
  it('não pede microfone, recebe áudio só como recvonly e troca a sessão para texto', async () => {
    const fake = createFakeWebRTC();
    const getUserMedia = jest.spyOn(fake.webrtc, 'getUserMedia');
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 201, text: async () => 'v=0 answer' });
    const transport = createWebRTCTransport({
      getClientSecret: async () => 'ek',
      webrtc: fake.webrtc,
      fetchImpl,
      mode: 'text',
    });
    await transport.connect(handlers());
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(fake.pc.addTransceiver).toHaveBeenCalledWith('audio', { direction: 'recvonly' });
    expect(JSON.parse(fake.channel.send.mock.calls[0][0])).toEqual({
      type: 'session.update',
      session: { type: 'realtime', output_modalities: ['text'] },
    });
  });
});
