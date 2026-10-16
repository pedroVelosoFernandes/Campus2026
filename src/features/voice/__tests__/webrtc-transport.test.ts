import type { WebRTCModule } from '@/features/voice/webrtc/types';
import {
  createWebRTCTransport,
  LIVE_DATA_CHANNEL,
  requestLiveSession,
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
    server(event: object) {
      channel.emit('message', { data: JSON.stringify(event) });
    },
  };
  const track = { enabled: true, stop: jest.fn() };
  const stream = { getAudioTracks: () => [track], getTracks: () => [track] };
  const pc = {
    connectionState: 'new',
    createDataChannel: jest.fn(() => channel),
    addTrack: jest.fn(),
    createOffer: jest.fn(async () => ({ type: 'offer', sdp: 'v=0 offer' })),
    setLocalDescription: jest.fn(async () => {}),
    setRemoteDescription: jest.fn(async () => {
      // O GPT-Live abre o canal e anuncia a sessão.
      setTimeout(() => {
        channel.emit('open');
        channel.server({ type: 'session.started', session: { id: 'sess_1' } });
      }, 0);
    }),
    addEventListener: jest.fn(),
    close: jest.fn(),
  };
  const audioSession = { start: jest.fn(), stop: jest.fn() };
  const webrtc: WebRTCModule = {
    createPeerConnection: () => pc,
    getUserMedia: async () => stream,
    attachRemoteAudio: () => () => {},
    audioSession,
  };
  return { webrtc, pc, channel, track, audioSession };
}

const handlers = () => ({ onEvent: jest.fn(), onError: jest.fn(), onClose: jest.fn() });
const sentTypes = (channel: { send: jest.Mock }) => channel.send.mock.calls.map(([data]) => JSON.parse(data).type);

describe('createWebRTCTransport (GPT-Live)', () => {
  it('envia a oferta ao nosso servidor, aplica a resposta e espera session.started', async () => {
    const fake = createFakeWebRTC();
    const requestSession = jest.fn().mockResolvedValue({ sessionId: 'sess_1', sdp: 'v=0 answer' });
    const transport = createWebRTCTransport({ requestSession, webrtc: fake.webrtc });
    const h = handlers();

    await transport.connect(h);

    expect(fake.pc.createDataChannel).toHaveBeenCalledWith(LIVE_DATA_CHANNEL);
    expect(requestSession).toHaveBeenCalledWith('v=0 offer');
    expect(fake.pc.setRemoteDescription).toHaveBeenCalledWith({ type: 'answer', sdp: 'v=0 answer' });
    expect(h.onEvent).toHaveBeenCalledWith({ type: 'session.started', session: { id: 'sess_1' } });
    expect(sentTypes(fake.channel)).not.toContain('session.start');

    fake.channel.emit('message', { data: 'lixo' });
    expect(h.onEvent).toHaveBeenCalledTimes(1);

    transport.send({ type: 'response.create', event_id: 'e1' });
    expect(fake.channel.send).toHaveBeenLastCalledWith('{"type":"response.create","event_id":"e1"}');

    transport.setMuted(true);
    expect(fake.track.enabled).toBe(false);
    expect(sentTypes(fake.channel).at(-1)).toBe('session.input_audio.mute');
  });

  it('encerra com session.close e espera session.closed antes de liberar recursos', async () => {
    const fake = createFakeWebRTC();
    const transport = createWebRTCTransport({
      requestSession: async () => ({ sessionId: 's', sdp: 'v=0 answer' }),
      webrtc: fake.webrtc,
    });
    const h = handlers();
    await transport.connect(h);

    const closing = transport.disconnect();
    expect(sentTypes(fake.channel).at(-1)).toBe('session.close');
    expect(fake.pc.close).not.toHaveBeenCalled();
    fake.channel.server({ type: 'session.closed', reason: 'close_requested' });
    await closing;
    expect(fake.pc.close).toHaveBeenCalled();
    expect(fake.track.stop).toHaveBeenCalled();
    fake.channel.emit('close');
    expect(h.onClose).not.toHaveBeenCalled();
  });

  it('libera recursos se session.closed não chegar a tempo', async () => {
    const fake = createFakeWebRTC();
    const transport = createWebRTCTransport({
      requestSession: async () => ({ sessionId: 's', sdp: 'v=0 answer' }),
      webrtc: fake.webrtc,
      closeTimeoutMs: 10,
    });
    await transport.connect(handlers());
    await transport.disconnect();
    expect(fake.pc.close).toHaveBeenCalled();
  });

  it('libera recursos e propaga o erro quando a criação da sessão falha', async () => {
    const fake = createFakeWebRTC();
    const transport = createWebRTCTransport({
      requestSession: async () => Promise.reject(new Error('401')),
      webrtc: fake.webrtc,
    });
    await expect(transport.connect(handlers())).rejects.toThrow('401');
    expect(fake.pc.close).toHaveBeenCalled();
    expect(fake.track.stop).toHaveBeenCalled();
  });
});

describe('viva-voz (sessão de áudio)', () => {
  it('liga ao abrir o microfone e desliga uma vez ao encerrar', async () => {
    const fake = createFakeWebRTC();
    const transport = createWebRTCTransport({
      requestSession: async () => ({ sessionId: 's', sdp: 'v=0 answer' }),
      webrtc: fake.webrtc,
      closeTimeoutMs: 10,
    });
    await transport.connect(handlers());
    expect(fake.audioSession.start).toHaveBeenCalledTimes(1);
    await transport.disconnect();
    await transport.disconnect();
    expect(fake.audioSession.stop).toHaveBeenCalledTimes(1);
  });

  it('desliga quando a conexão falha e não derruba a chamada se o módulo nativo falhar', async () => {
    const fake = createFakeWebRTC();
    const failing = createWebRTCTransport({ requestSession: async () => Promise.reject(new Error('500')), webrtc: fake.webrtc });
    await expect(failing.connect(handlers())).rejects.toThrow('500');
    expect(fake.audioSession.stop).toHaveBeenCalledTimes(1);

    const broken = createFakeWebRTC();
    broken.audioSession.start.mockImplementation(() => {
      throw new Error('InCallManager ausente');
    });
    const transport = createWebRTCTransport({
      requestSession: async () => ({ sessionId: 's', sdp: 'v=0 answer' }),
      webrtc: broken.webrtc,
    });
    await expect(transport.connect(handlers())).resolves.toBeUndefined();
  });
});

describe('requestLiveSession', () => {
  it('posta a oferta SDP na rota do nosso servidor (sem chave no app)', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ sessionId: 's1', sdp: 'v=0 a' }) });
    await expect(requestLiveSession('https://api.exemplo/', 'v=0 o', fetchImpl)).resolves.toEqual({
      sessionId: 's1',
      sdp: 'v=0 a',
    });
    expect(fetchImpl).toHaveBeenCalledWith('https://api.exemplo/api/live-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: 'v=0 o',
    });
  });

  it('erro quando o servidor falha ou responde algo inválido', async () => {
    await expect(requestLiveSession('x', 'v=0', jest.fn().mockResolvedValue({ ok: false, status: 429 }))).rejects.toThrow(
      '429',
    );
    const bad = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    await expect(requestLiveSession('x', 'v=0', bad)).rejects.toThrow('inválida');
  });
});
