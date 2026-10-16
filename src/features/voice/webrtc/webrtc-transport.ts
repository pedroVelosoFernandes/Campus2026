import type { FetchLike } from '@/services/symptom-model/types';

import { createEventIdFactory } from '../delegation';
import type { LiveClientEvent, LiveServerEvent, TransportHandlers, VoiceTransport } from '../types';
import type { DataChannelLike, MediaStreamLike, PeerConnectionLike, WebRTCModule } from './types';

/**
 * Transporte WebRTC para o GPT-Live.
 * Handshake (docs: https://developers.openai.com/api/docs/guides/realtime-webrtc, seção GPT-Live):
 * 1. o app cria o canal `oai-events` e a oferta SDP;
 * 2. envia a oferta para a NOSSA rota `/api/live-session`, que chama
 *    `POST /v1/live/sessions` com a chave do projeto e devolve a resposta SDP;
 * 3. aplica a resposta e espera `session.started` (não envia `session.start`);
 * 4. ao sair, envia `session.close` e espera `session.closed`.
 */

export const LIVE_DATA_CHANNEL = 'oai-events';
export const CONNECT_TIMEOUT_MS = 15_000;
export const CLOSE_TIMEOUT_MS = 3_000;

export interface LiveSessionAnswer {
  sessionId: string;
  sdp: string;
}

export interface WebRTCTransportOptions {
  /** Envia a oferta SDP ao nosso servidor e devolve a resposta do GPT-Live. */
  requestSession: (offerSdp: string) => Promise<LiveSessionAnswer>;
  webrtc: WebRTCModule;
  connectTimeoutMs?: number;
  closeTimeoutMs?: number;
}

export async function requestLiveSession(
  apiUrl: string,
  offerSdp: string,
  fetchImpl: FetchLike = (url, init) => fetch(url, init),
): Promise<LiveSessionAnswer> {
  const response = await fetchImpl(`${apiUrl.replace(/\/+$/, '')}/api/live-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sdp' },
    body: offerSdp,
  });
  if (!response.ok) throw new Error(`Não foi possível iniciar a conversa por voz (${response.status})`);
  const data = (await response.json()) as Partial<LiveSessionAnswer>;
  if (typeof data.sdp !== 'string' || typeof data.sessionId !== 'string') {
    throw new Error('Resposta inválida do servidor de voz');
  }
  return { sessionId: data.sessionId, sdp: data.sdp };
}

export function parseServerEvent(data: unknown): LiveServerEvent | null {
  if (typeof data !== 'string') return null;
  try {
    const parsed = JSON.parse(data) as { type?: unknown };
    return typeof parsed.type === 'string' ? (parsed as LiveServerEvent) : null;
  } catch {
    return null;
  }
}

/** Promessa resolvida por um evento, com limite de tempo. */
function waiter(timeoutMs: number, timeoutMessage: string) {
  let resolve: () => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<void>((res, rej) => {
    const timer = setTimeout(() => rej(new Error(timeoutMessage)), timeoutMs);
    resolve = () => (clearTimeout(timer), res());
    reject = (error) => (clearTimeout(timer), rej(error));
  });
  return { promise, resolve, reject };
}

async function negotiate(pc: PeerConnectionLike, options: WebRTCTransportOptions) {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  if (!offer.sdp) throw new Error('Oferta SDP vazia');
  const answer = await options.requestSession(offer.sdp);
  await pc.setRemoteDescription({ type: 'answer', sdp: answer.sdp });
}

export function createWebRTCTransport(options: WebRTCTransportOptions): VoiceTransport {
  const nextEventId = createEventIdFactory('evt_rtc');
  let pc: PeerConnectionLike | null = null;
  let channel: DataChannelLike | null = null;
  let stream: MediaStreamLike | null = null;
  let detachAudio: (() => void) | null = null;
  let closing: ReturnType<typeof waiter> | null = null;
  let closed = true;

  function teardown() {
    closed = true;
    detachAudio?.();
    channel?.close();
    stream?.getTracks().forEach((track) => track.stop());
    pc?.close();
    pc = channel = stream = detachAudio = null;
  }

  function send(event: LiveClientEvent) {
    if (channel?.readyState === 'open') channel.send(JSON.stringify(event));
  }

  // Eventos chegam por um RTCDataChannel da nossa própria conexão, não por postMessage entre janelas.
  function wire(peer: PeerConnectionLike, dataChannel: DataChannelLike, handlers: TransportHandlers, started: () => void) {
    dataChannel.addEventListener('message', (message) => {
      const event = parseServerEvent(message.data);
      if (!event) return;
      if (event.type === 'session.started') started();
      if (event.type === 'session.closed') closing?.resolve();
      handlers.onEvent(event);
    });
    dataChannel.addEventListener('close', () => {
      if (!closed) handlers.onClose();
    });
    peer.addEventListener('connectionstatechange', () => {
      if (!closed && peer.connectionState === 'failed') handlers.onError(new Error('Conexão de voz perdida'));
    });
  }

  return {
    async connect(handlers) {
      closed = false;
      const ready = waiter(options.connectTimeoutMs ?? CONNECT_TIMEOUT_MS, 'O assistente demorou para responder');
      try {
        const localStream = await options.webrtc.getUserMedia();
        stream = localStream;
        pc = options.webrtc.createPeerConnection();
        localStream.getAudioTracks().forEach((track) => pc?.addTrack(track, localStream));
        detachAudio = options.webrtc.attachRemoteAudio(pc);
        channel = pc.createDataChannel(LIVE_DATA_CHANNEL);
        wire(pc, channel, handlers, ready.resolve);
        await negotiate(pc, options);
        await ready.promise;
      } catch (error) {
        ready.promise.catch(() => undefined);
        teardown();
        throw error;
      }
    },
    send,
    setMuted(muted) {
      stream?.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
      send({ type: muted ? 'session.input_audio.mute' : 'session.input_audio.unmute', event_id: nextEventId() });
    },
    async disconnect() {
      if (closed) return;
      if (channel?.readyState === 'open') {
        closing = waiter(options.closeTimeoutMs ?? CLOSE_TIMEOUT_MS, 'session.closed não chegou');
        closed = true; // a partir daqui, fechar o canal não é erro
        send({ type: 'session.close', event_id: nextEventId() });
        await closing.promise.catch(() => undefined);
        closing = null;
      }
      teardown();
    },
  };
}
