import { act, renderHook } from '@testing-library/react-native';

import { resolveVoiceMode } from '@/features/voice/config';
import type { VoiceTransport } from '@/features/voice/types';
import { useTextAssistant } from '@/features/voice/use-text-assistant';
import { useVoiceAssistant } from '@/features/voice/use-voice-assistant';
import {
  buildIntroScript,
  createMockUnitFinder,
  createMockVoiceTransport,
  getMockCoordinates,
  MOCK_SYMPTOM_ASSESSMENT,
  MOCK_SYMPTOM_CALL_ID,
} from '@/mocks/voice-conversation';

jest.mock('react-native-webrtc', () => ({ RTCPeerConnection: jest.fn(), mediaDevices: {} }));

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

/** Avança o relógio em passos, deixando as promessas (ferramentas) resolverem entre eles. */
async function advance(ms: number, step = 100) {
  for (let elapsed = 0; elapsed < ms; elapsed += step) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(step, ms - elapsed));
    });
  }
}

function mockDeps(mode: 'voice' | 'text') {
  return {
    transport: createMockVoiceTransport({ stepDelayMs: 100, mode }),
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

describe('useVoiceAssistant com o GPT-Live simulado', () => {
  it('febre e dor de cabeça: delegação avalia sintomas, busca UBS e o assistente fala a orientação', async () => {
    const deps = mockDeps('voice');
    const sendSpy = jest.spyOn(deps.transport, 'send');
    const { result } = await renderHook(() => useVoiceAssistant(deps));

    expect(result.current.state).toBe('idle');
    await act(() => result.current.start());
    await advance(buildIntroScript(100).reduce((total, step) => total + step.delayMs, 0));

    // Resultado da avaliação devolvido ao backend e conversa retomada.
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'response.item.create',
        item: expect.objectContaining({ type: 'function_call_output', call_id: MOCK_SYMPTOM_CALL_ID }),
      }),
    );
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'response.create' }));

    await advance(20_000);
    expect(result.current.state).toBe('listening');
    const roles = result.current.transcript.map((message) => message.role);
    expect(roles).toEqual(['assistant', 'user', 'assistant', 'user', 'assistant', 'analysis', 'units', 'assistant']);
    expect(result.current.transcript[1]).toMatchObject({ text: 'Tô com febre e dor de cabeça desde anteontem.' });
    const spoken = result.current.transcript[7];
    expect(spoken.role === 'assistant' && spoken.text).toContain(MOCK_SYMPTOM_ASSESSMENT.orientation);
    expect(spoken.role === 'assistant' && spoken.text).toContain('UBS');
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
      disconnect: jest.fn().mockResolvedValue(undefined),
    };
    const { result } = await renderHook(() => useVoiceAssistant({ ...mockDeps('voice'), transport }));
    await act(() => result.current.start());
    expect(result.current.state).toBe('error');
    expect(result.current.error).toBe('Microfone negado');
    expect(transport.disconnect).toHaveBeenCalled();
  });
});

describe('useTextAssistant com o backend simulado', () => {
  it('vacinação por texto: conecta sozinho, busca unidades e sugere a tela de vacinação', async () => {
    const deps = mockDeps('text');
    const sendSpy = jest.spyOn(deps.transport, 'send');
    const { result } = await renderHook(() => useTextAssistant(deps));
    const text = 'Quero tomar a vacina da gripe, onde vou?';

    await act(() => result.current.sendMessage(text));
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'app.user_text', text }));

    await advance(20_000);
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
