import type { FetchLike } from '@/services/symptom-model/types';

import type { RealtimeClientEvent, RealtimeServerEvent, TransportHandlers, VoiceTransport } from '../types';
import type { DataChannelLike, MediaStreamLike, PeerConnectionLike, WebRTCModule } from './types';

/**
 * Transporte WebRTC para a Realtime API ("GPT Live").
 * Handshake (docs: https://developers.openai.com/api/docs/guides/realtime-webrtc):
 * 1. o app pede um client secret efêmero à nossa rota `/api/realtime-session`;
 * 2. cria a oferta SDP e faz `POST https://api.openai.com/v1/realtime/calls`
 *    com `Authorization: Bearer <efêmero>` e `Content-Type: application/sdp`;
 * 3. aplica a resposta SDP; eventos trafegam no data channel `oai-events`.
 */

export const OPENAI_REALTIME_CALLS_URL = 'https://api.openai.com/v1/realtime/calls';
export const REALTIME_DATA_CHANNEL = 'oai-events';

export interface WebRTCTransportOptions {
  /** Busca o client secret efêmero no nosso backend. */
  getClientSecret: () => Promise<string>;
  webrtc: WebRTCModule;
  /**
   * `audio` (padrão): voz com microfone. `text`: modo chat, sem microfone; a
   * sessão é trocada para saída só em texto via `session.update`.
   */
  mode?: 'audio' | 'text';
  fetchImpl?: FetchLike;
  callsUrl?: string;
}

export async function fetchClientSecret(apiUrl: string, fetchImpl: FetchLike = (u, i) => fetch(u, i)) {
  const response = await fetchImpl(`${apiUrl.replace(/\/+$/, '')}/api/realtime-session`, { method: 'POST' });
  if (!response.ok) throw new Error(`Não foi possível iniciar a sessão de voz (${response.status})`);
  const data = (await response.json()) as { clientSecret?: unknown };
  if (typeof data.clientSecret !== 'string') throw new Error('Sessão de voz sem client secret');
  return data.clientSecret;
}

function parseServerEvent(data: unknown): RealtimeServerEvent | null {
  if (typeof data !== 'string') return null;
  try {
    const parsed = JSON.parse(data) as { type?: unknown };
    return typeof parsed.type === 'string' ? (parsed as RealtimeServerEvent) : null;
  } catch {
    return null;
  }
}

function waitForOpen(channel: DataChannelLike): Promise<void> {
  if (channel.readyState === 'open') return Promise.resolve();
  return new Promise((resolve, reject) => {
    channel.addEventListener('open', () => resolve());
    channel.addEventListener('error', () => reject(new Error('Falha ao abrir o canal de eventos')));
  });
}

/** Troca de SDP: envia a oferta à OpenAI com o client secret efêmero e aplica a resposta. */
async function negotiate(peer: PeerConnectionLike, clientSecret: string, doFetch: FetchLike, url: string) {
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  const response = await doFetch(url, {
    method: 'POST',
    body: offer.sdp,
    headers: { Authorization: `Bearer ${clientSecret}`, 'Content-Type': 'application/sdp' },
  });
  if (!response.ok) throw new Error(`Falha na negociação WebRTC (${response.status})`);
  await peer.setRemoteDescription({ type: 'answer', sdp: await response.text() });
}

export function createWebRTCTransport(options: WebRTCTransportOptions): VoiceTransport {
  const doFetch: FetchLike = options.fetchImpl ?? ((url, init) => fetch(url, init));
  let pc: PeerConnectionLike | null = null;
  let channel: DataChannelLike | null = null;
  let stream: MediaStreamLike | null = null;
  let detachAudio: (() => void) | null = null;
  let closed = false;
  const textMode = options.mode === 'text';

  function teardown() {
    closed = true;
    detachAudio?.();
    channel?.close();
    stream?.getTracks().forEach((track) => track.stop());
    pc?.close();
    pc = channel = stream = detachAudio = null;
  }

  function wire(peer: PeerConnectionLike, events: DataChannelLike, handlers: TransportHandlers) {
    events.addEventListener('message', (event) => {
      const parsed = parseServerEvent(event.data);
      if (parsed) handlers.onEvent(parsed);
    });
    events.addEventListener('close', () => {
      if (!closed) handlers.onClose();
    });
    peer.addEventListener('connectionstatechange', () => {
      if (!closed && peer.connectionState === 'failed') handlers.onError(new Error('Conexão de voz perdida'));
    });
  }

  return {
    async connect(handlers) {
      closed = false;
      try {
        const clientSecret = await options.getClientSecret();
        pc = options.webrtc.createPeerConnection();
        if (textMode) {
          pc.addTransceiver('audio', { direction: 'recvonly' });
        } else {
          const localStream = await options.webrtc.getUserMedia();
          stream = localStream;
          localStream.getAudioTracks().forEach((track) => pc?.addTrack(track, localStream));
          detachAudio = options.webrtc.attachRemoteAudio(pc);
        }
        channel = pc.createDataChannel(REALTIME_DATA_CHANNEL);
        wire(pc, channel, handlers);
        const opened = waitForOpen(channel);
        await negotiate(pc, clientSecret, doFetch, options.callsUrl ?? OPENAI_REALTIME_CALLS_URL);
        await opened;
        if (textMode) {
          channel.send(JSON.stringify({ type: 'session.update', session: { type: 'realtime', output_modalities: ['text'] } }));
        }
      } catch (error) {
        teardown();
        throw error;
      }
    },
    send(event: RealtimeClientEvent) {
      if (channel?.readyState === 'open') channel.send(JSON.stringify(event));
    },
    setMuted(muted) {
      stream?.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    },
    disconnect: teardown,
  };
}
