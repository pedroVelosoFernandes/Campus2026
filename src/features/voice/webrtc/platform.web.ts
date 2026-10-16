import type { MediaStreamLike, PeerConnectionLike, WebRTCModule } from './types';

/** Implementação web usando a API WebRTC nativa do navegador. */
export const platformWebRTC: WebRTCModule = {
  createPeerConnection: () => new RTCPeerConnection() as unknown as PeerConnectionLike,
  getUserMedia: async () =>
    (await navigator.mediaDevices.getUserMedia({ audio: true })) as unknown as MediaStreamLike,
  attachRemoteAudio: (pc) => {
    const audio = document.createElement('audio');
    audio.autoplay = true;
    const peer = pc as unknown as RTCPeerConnection;
    const onTrack = (event: RTCTrackEvent) => {
      audio.srcObject = event.streams[0] ?? null;
    };
    peer.addEventListener('track', onTrack);
    return () => {
      peer.removeEventListener('track', onTrack);
      audio.srcObject = null;
    };
  },
};
