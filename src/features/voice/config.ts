import { MOCK_HEALTH_UNITS } from '@/mocks/health-units';
import {
  createMockSymptomAnalyzer,
  createMockUnitFinder,
  createMockVoiceTransport,
  getMockCoordinates,
} from '@/mocks/voice-conversation';
import { createLocalUnitFinder } from '@/services/health-units/local-finder';
import { createHttpSymptomAnalyzer } from '@/services/symptom-model/http-analyzer';

import type { ToolDependencies } from './tool-call';
import type { VoiceTransport } from './types';
import { platformWebRTC } from './webrtc/platform';
import { createWebRTCTransport, fetchClientSecret } from './webrtc/webrtc-transport';

export type VoiceMode = 'live' | 'mock';
/** Canal da conversa: voz (microfone + fala) ou texto (chat). */
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
      analyzer: createMockSymptomAnalyzer(),
      unitFinder: createMockUnitFinder(),
      getCoordinates: getMockCoordinates,
    };
  }
  return {
    mode: 'live',
    transport: createWebRTCTransport({
      getClientSecret: () => fetchClientSecret(apiUrl),
      webrtc: platformWebRTC,
      mode: channel === 'text' ? 'text' : 'audio',
    }),
    analyzer: createHttpSymptomAnalyzer(apiUrl),
    // Ainda não há base oficial de unidades integrada: usa os dados de exemplo.
    unitFinder: createLocalUnitFinder(MOCK_HEALTH_UNITS),
  };
}
