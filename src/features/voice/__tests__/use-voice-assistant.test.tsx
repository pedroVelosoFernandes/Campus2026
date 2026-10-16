import { act, renderHook } from '@testing-library/react-native';

import { resolveVoiceMode } from '@/features/voice/config';
import type { VoiceTransport } from '@/features/voice/types';
import { useTextAssistant } from '@/features/voice/use-text-assistant';
import { useVoiceAssistant } from '@/features/voice/use-voice-assistant';
import {
  buildIntroScript,
  createMockSymptomAnalyzer,
  createMockUnitFinder,
  createMockVoiceTransport,
  getMockCoordinates,
  MOCK_SYMPTOM_ARGS,
  MOCK_SYMPTOM_RESULT,
} from '@/mocks/voice-conversation';

jest.mock('react-native-webrtc', () => ({ RTCPeerConnection: jest.fn(), mediaDevices: {} }));

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

/** Avança o relógio em passos, deixando as promessas (ferramentas) resolverem entre eles. */
async function advance(ms: number, step = 250) {
  for (let elapsed = 0; elapsed < ms; elapsed += step) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(step, ms - elapsed));
    });
  }
}

function mockDeps(mode: 'voice' | 'text') {
  return {
    transport: createMockVoiceTransport({ stepDelayMs: 100, mode }),
    analyzer: createMockSymptomAnalyzer(500),
    unitFinder: createMockUnitFinder(),
    getCoordinates: getMockCoordinates,
  };
}

describe('resolveVoiceMode', () => {
  it.each([
    [{ mock: '1', apiUrl: 'https://api' }, 'mock'],
    [{ mock: 'true' }, 'mock'],
    [{}, 'mock'],
    [{ apiUrl: '  ' }, 'mock'],
    [{ mock: '0', apiUrl: 'https://api' }, 'live'],
  ])('%j -> %s', (env, mode) => {
    expect(resolveVoiceMode(env)).toBe(mode);
  });
});

describe('useVoiceAssistant com a conversa simulada', () => {
  it('febre e dor de cabeça: analisa sintomas, fala a orientação e busca UBS', async () => {
    const deps = mockDeps('voice');
    const sendSpy = jest.spyOn(deps.transport, 'send');
    const analyzeSpy = jest.spyOn(deps.analyzer, 'analyze');
    const { result } = await renderHook(() => useVoiceAssistant(deps));

    expect(result.current.state).toBe('idle');
    await act(() => result.current.start());
    expect(result.current.state).toBe('listening');

    // Fim do roteiro inicial: a ferramenta foi chamada e o analisador está "pensando".
    await advance(buildIntroScript(100).reduce((total, step) => total + step.delayMs, 0));
    expect(analyzeSpy).toHaveBeenCalledWith(MOCK_SYMPTOM_ARGS, {});
    expect(result.current.state).toBe('analyzing_symptoms');

    await advance(500);
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'conversation.item.create' }));
    expect(sendSpy).toHaveBeenLastCalledWith({ type: 'response.create' });

    await advance(30_000);
    expect(result.current.state).toBe('listening');
    const roles = result.current.transcript.map((message) => message.role);
    expect(roles).toEqual(['assistant', 'user', 'assistant', 'user', 'analysis', 'assistant', 'units', 'assistant']);
    const spoken = result.current.transcript[5];
    expect(spoken.role === 'assistant' && spoken.text).toBe(MOCK_SYMPTOM_RESULT.orientation);
    expect(result.current.suggestedAction).toMatchObject({ kind: 'cuidar-saude' });

    await act(() => result.current.stop());
    expect(result.current.state).toBe('idle');
  });

  it('mute alterna e repassa ao transporte', async () => {
    const deps = mockDeps('voice');
    const muteSpy = jest.spyOn(deps.transport, 'setMuted');
    const { result } = await renderHook(() => useVoiceAssistant(deps));
    await act(() => result.current.mute());
    expect(result.current.muted).toBe(true);
    expect(muteSpy).toHaveBeenLastCalledWith(true);
    await act(() => result.current.mute(false));
    expect(result.current.muted).toBe(false);
  });

  it('falha de conexão leva ao estado de erro e desconecta', async () => {
    const transport: VoiceTransport = {
      connect: jest.fn().mockRejectedValue(new Error('Microfone negado')),
      send: jest.fn(),
      setMuted: jest.fn(),
      disconnect: jest.fn(),
    };
    const { result } = await renderHook(() => useVoiceAssistant({ ...mockDeps('voice'), transport }));
    await act(() => result.current.start());
    expect(result.current.state).toBe('error');
    expect(result.current.error).toBe('Microfone negado');
    expect(transport.disconnect).toHaveBeenCalled();
  });
});

describe('useTextAssistant com a conversa simulada', () => {
  it('vacinação por texto: conecta sozinho, busca unidades e sugere a tela de vacinação', async () => {
    const deps = mockDeps('text');
    const sendSpy = jest.spyOn(deps.transport, 'send');
    const { result } = await renderHook(() => useTextAssistant(deps));
    const text = 'Quero tomar a vacina da gripe, onde vou?';

    await act(() => result.current.sendMessage(text));
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'conversation.item.create',
      item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] },
    });
    expect(sendSpy).toHaveBeenCalledWith({ type: 'response.create', response: { output_modalities: ['text'] } });

    await advance(30_000);
    const roles = result.current.transcript.map((message) => message.role);
    expect(roles).toEqual(['user', 'assistant', 'units', 'assistant']);
    const units = result.current.transcript[2];
    expect(units.role === 'units' && units.result.units[0].services).toContain('vacinacao');
    expect(result.current.suggestedAction).toMatchObject({ kind: 'vacinacao' });
    expect(result.current.state).toBe('listening');
  });

  it('ignora mensagem vazia', async () => {
    const deps = mockDeps('text');
    const sendSpy = jest.spyOn(deps.transport, 'send');
    const { result } = await renderHook(() => useTextAssistant(deps));
    await act(() => result.current.sendMessage('   '));
    expect(sendSpy).not.toHaveBeenCalled();
    expect(result.current.state).toBe('idle');
  });
});
