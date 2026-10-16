import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AssistenteScreen from '@/app/assistente';
import { useVoiceAssistant, type VoiceAssistant } from '@/features/voice';
import { colors } from '@/theme';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));

jest.mock('@/features/voice', () => ({ useVoiceAssistant: jest.fn() }));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <AssistenteScreen />
    </SafeAreaProvider>,
  );

const mockedRouter = jest.mocked(router);
const mockedHook = jest.mocked(useVoiceAssistant);

function voice(overrides: Partial<VoiceAssistant> = {}): VoiceAssistant {
  return {
    state: 'listening',
    transcript: [
      { id: 'u1', role: 'user', text: 'Quero colocar minhas vacinas em dia e saber onde posso ir.', final: true },
      { id: 'a1', role: 'assistant', text: 'Vou ajudar você a encontrar o atendimento.', final: true },
    ],
    muted: false,
    error: null,
    suggestedAction: null,
    mode: 'mock',
    start: jest.fn(async () => {}),
    stop: jest.fn(),
    mute: jest.fn(),
    ...overrides,
  };
}

describe('Tela Assistente', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mostra o cabeçalho, o estado e a transcrição do design', async () => {
    const assistant = voice();
    mockedHook.mockReturnValue(assistant);
    await renderScreen();

    expect(screen.getByText('Assistente')).toBeTruthy();
    expect(screen.getByText('Ouvindo você')).toBeTruthy();
    expect(screen.getByText('Você pode falar naturalmente.')).toBeTruthy();
    expect(screen.getByText('Quero colocar minhas vacinas em dia e saber onde posso ir.')).toBeTruthy();
    expect(screen.getByText('Vou ajudar você a encontrar o atendimento.')).toBeTruthy();
    expect(screen.getByText('Teclado')).toBeTruthy();
    expect(screen.getByText('Ouvindo')).toBeTruthy();
    expect(screen.getByText('Encerrar')).toBeTruthy();
    expect(assistant.start).toHaveBeenCalledTimes(1);
  });

  it('troca o título conforme o estado da conversa', async () => {
    mockedHook.mockReturnValue(voice({ state: 'analyzing_symptoms' }));
    await renderScreen();
    expect(screen.getByText('Analisando…')).toBeTruthy();
  });

  it('o microfone alterna o mudo e mostra "Mudo"', async () => {
    const assistant = voice({ muted: true });
    mockedHook.mockReturnValue(assistant);
    await renderScreen();

    expect(screen.getByText('Mudo')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /Microfone desligado/ }));
    expect(assistant.mute).toHaveBeenCalledTimes(1);
  });

  it('"Encerrar" e o chevron param a sessão e voltam', async () => {
    const assistant = voice();
    mockedHook.mockReturnValue(assistant);
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Encerrar conversa' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar e encerrar conversa' }));

    expect(assistant.stop).toHaveBeenCalledTimes(2);
    expect(mockedRouter.back).toHaveBeenCalledTimes(2);
  });

  it('"Teclado" encerra a voz e abre Conversas', async () => {
    const assistant = voice();
    mockedHook.mockReturnValue(assistant);
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: /Teclado/ }));
    expect(assistant.stop).toHaveBeenCalled();
    expect(mockedRouter.navigate).toHaveBeenCalledWith('/conversas');
  });

  it('a sugestão leva à tela indicada', async () => {
    const assistant = voice({ suggestedAction: { kind: 'vacinacao', label: 'Ver locais de vacinação' } });
    mockedHook.mockReturnValue(assistant);
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: /Ver locais de vacinação/ }));
    expect(assistant.stop).toHaveBeenCalled();
    expect(mockedRouter.navigate).toHaveBeenCalledWith('/vacinacao');
  });

  it('em emergência, oferece ligar para o SAMU 192', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    mockedHook.mockReturnValue(
      voice({ suggestedAction: { kind: 'cuidar-saude', emergency: true, label: 'Ligue 192 (SAMU) agora' } }),
    );
    await renderScreen();

    expect(screen.getByText('Ligue 192 (SAMU) agora')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Ligar para o SAMU, 192' }));
    expect(openURL).toHaveBeenCalledWith('tel:192');
  });

  it('em erro, mostra mensagem amigável e tenta de novo', async () => {
    const assistant = voice({ state: 'error', error: 'ICE failed', transcript: [] });
    mockedHook.mockReturnValue(assistant);
    await renderScreen();

    expect(screen.getByText('Não foi possível conectar')).toBeTruthy();
    expect(screen.queryByText('ICE failed')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(assistant.start).toHaveBeenCalledTimes(2);
  });

  it('o orbe fica parado enquanto a pessoa fala e só anima com a voz do assistente', async () => {
    mockedHook.mockReturnValue(voice({ state: 'user_speaking' }));
    await renderScreen();
    expect(screen.getByTestId('assistant-orb', { includeHiddenElements: true }).props.accessibilityValue).toEqual({ text: 'parado' });

    mockedHook.mockReturnValue(voice({ state: 'assistant_speaking' }));
    await screen.rerender(
      <SafeAreaProvider initialMetrics={METRICS}>
        <AssistenteScreen />
      </SafeAreaProvider>,
    );
    expect(screen.getByText('Respondendo')).toBeTruthy();
    expect(screen.getByTestId('assistant-orb', { includeHiddenElements: true }).props.accessibilityValue).toEqual({ text: 'animando' });
  });

  it.each(['listening', 'thinking', 'searching_units', 'idle'] as const)('em "%s" o orbe não anima', async (state) => {
    mockedHook.mockReturnValue(voice({ state }));
    await renderScreen();
    expect(screen.getByTestId('assistant-orb', { includeHiddenElements: true }).props.accessibilityValue).toEqual({ text: 'parado' });
  });

  it('a fala da pessoa usa balão menta e a fala em captura fica destacada', async () => {
    mockedHook.mockReturnValue(
      voice({
        state: 'user_speaking',
        transcript: [
          { id: 'a0', role: 'assistant', text: 'Do que você precisa?', final: true },
          { id: 'u0', role: 'user', text: 'Tô com febre', final: true },
          { id: 'u1', role: 'user', text: 'e dor de cabeça desde', final: false },
        ],
      }),
    );
    await renderScreen();

    const bg = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style).backgroundColor;
    expect(bg('bubble-assistant')).toBe(colors.bubbleAssistant);
    expect(bg('bubble-user')).toBe(colors.bubbleUser);
    expect(screen.getByTestId('bubble-user-live')).toBeTruthy();
    expect(screen.getByLabelText('Você (falando agora): e dor de cabeça desde')).toBeTruthy();
  });

  it('quando a pessoa termina de falar, o balão deixa de ser "ao vivo"', async () => {
    mockedHook.mockReturnValue(
      voice({ state: 'thinking', transcript: [{ id: 'u1', role: 'user', text: 'Tô com febre', final: false }] }),
    );
    await renderScreen();
    expect(screen.queryByTestId('bubble-user-live')).toBeNull();
    expect(screen.getByTestId('bubble-user')).toBeTruthy();
  });
});
