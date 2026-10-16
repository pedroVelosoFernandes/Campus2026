import { mediaDevices, RTCPeerConnection } from 'react-native-webrtc';

import { createInCallAudioSession } from './audio-session';
import type { MediaStreamLike, PeerConnectionLike, WebRTCModule } from './types';

/** Implementação nativa (iOS/Android) via `react-native-webrtc`. */
export const platformWebRTC: WebRTCModule = {
  createPeerConnection: () => new RTCPeerConnection() as unknown as PeerConnectionLike,
  getUserMedia: async () =>
    (await mediaDevices.getUserMedia({ audio: true, video: false })) as unknown as MediaStreamLike,
  // No react-native-webrtc o áudio remoto toca automaticamente.
  attachRemoteAudio: () => () => {},
  // Viva-voz durante a conversa; desliga ao encerrar (ver audio-session.ts).
  audioSession: createInCallAudioSession(),
};
