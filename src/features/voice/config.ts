import { MOCK_HEALTH_UNITS } from '@/mocks/health-units';
import { createMockUnitFinder, createMockVoiceTransport, getMockCoordinates } from '@/mocks/voice-conversation';
import { createLocalUnitFinder } from '@/services/health-units/local-finder';

import { createTextTransport } from './text/text-transport';
import type { ToolDependencies } from './tool-call';
import type { VoiceTransport } from './types';
import { platformWebRTC } from './webrtc/platform';
import { createWebRTCTransport, requestLiveSession } from './webrtc/webrtc-transport';

export type VoiceMode = 'live' | 'mock';
/** Canal da conversa: voz (GPT-Live) ou texto (rota /api/assistant-text). */
export type AssistantChannel = 'voice' | 'text';

export interface VoiceEnv {
  apiUrl?: string;
  mock?: string;
}

export interface VoiceDependencies extends ToolDependencies {
  mode: VoiceMode;
  transport: VoiceTransport;
}

/** Lê as variáveis públicas do app (nunca segredos: elas vão para o bundle). */
export function readVoiceEnv(): VoiceEnv {
  return {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    mock: process.env.EXPO_PUBLIC_VOICE_MOCK,
  };
}

/** Modo simulado quando pedido explicitamente ou quando não há backend configurado. */
export function resolveVoiceMode(env: VoiceEnv): VoiceMode {
  const mockFlag = env.mock?.trim().toLowerCase();
  if (mockFlag === '1' || mockFlag === 'true') return 'mock';
  return env.apiUrl?.trim() ? 'live' : 'mock';
}

export function createVoiceDependencies(
  channel: AssistantChannel = 'voice',
  env: VoiceEnv = readVoiceEnv(),
): VoiceDependencies {
  const apiUrl = env.apiUrl?.trim();
  if (resolveVoiceMode(env) === 'mock' || !apiUrl) {
    return {
      mode: 'mock',
      transport: createMockVoiceTransport({ mode: channel }),
      unitFinder: createMockUnitFinder(),
      getCoordinates: getMockCoordinates,
    };
  }
  const transport =
    channel === 'text'
      ? createTextTransport({ apiUrl })
      : createWebRTCTransport({ requestSession: (sdp) => requestLiveSession(apiUrl, sdp), webrtc: platformWebRTC });
  // Ainda não há base oficial de unidades integrada: usa os dados de exemplo.
  return { mode: 'live', transport, unitFinder: createLocalUnitFinder(MOCK_HEALTH_UNITS) };
}
