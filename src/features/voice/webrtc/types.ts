/**
 * Subconjunto mínimo da API WebRTC usada pelo transporte. Permite usar
 * `react-native-webrtc` no celular, a API do navegador na web e fakes nos testes.
 */

export interface DataChannelLike {
  readonly readyState: string;
  send(data: string): void;
  close(): void;
  addEventListener(type: 'open' | 'close' | 'error', listener: () => void): void;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
}

export interface AudioTrackLike {
  enabled: boolean;
  stop(): void;
}

export interface MediaStreamLike {
  getAudioTracks(): AudioTrackLike[];
  getTracks(): AudioTrackLike[];
}

export interface PeerConnectionLike {
  readonly connectionState: string;
  createDataChannel(label: string): DataChannelLike;
  addTrack(track: AudioTrackLike, stream: MediaStreamLike): unknown;
  createOffer(): Promise<{ sdp?: string; type?: string }>;
  setLocalDescription(description: { sdp?: string; type?: string }): Promise<void>;
  setRemoteDescription(description: { sdp: string; type: 'answer' }): Promise<void>;
  addEventListener(type: 'connectionstatechange', listener: () => void): void;
  close(): void;
}

export interface WebRTCModule {
  createPeerConnection(): PeerConnectionLike;
  getUserMedia(): Promise<MediaStreamLike>;
  /** Liga o áudio remoto à saída de som (no-op no celular, onde é automático). */
  attachRemoteAudio(pc: PeerConnectionLike): () => void;
}
