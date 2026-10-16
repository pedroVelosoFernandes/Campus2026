import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking } from 'react-native';

import ConversasScreen from '@/app/(tabs)/conversas/index';
import { isYesNoQuestion } from '@/components/conversas/chat-model';
import { useTextAssistant, type TextAssistant } from '@/features/voice';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('@/features/voice', () => ({ useTextAssistant: jest.fn() }));

const mockedRouter = jest.mocked(router);
const mockedParams = jest.mocked(useLocalSearchParams);
const mockedHook = jest.mocked(useTextAssistant);
const sendMessage = jest.fn(async () => {});

function assistant(overrides: Partial<TextAssistant> = {}): TextAssistant {
  return {
    state: 'idle',
    transcript: [],
    error: null,
    suggestedAction: null,
    mode: 'mock',
    sendMessage,
    start: jest.fn(async () => {}),
    stop: jest.fn(),
    ...overrides,
  };
}

const DESIGN_TRANSCRIPT: TextAssistant['transcript'] = [
  { id: 'u1', role: 'user', text: 'Estou com dor de garganta desde ontem.', final: true },
  { id: 'a1', role: 'assistant', text: 'Você está com dificuldade para respirar?', final: true },
];

describe('Tela Conversas (Orientação de atendimento)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedParams.mockReturnValue({});
    mockedHook.mockReturnValue(assistant());
  });

  it('mostra título, saudação genérica, campo e aviso', async () => {
    await render(<ConversasScreen />);

    expect(screen.getByRole('header', { name: 'Orientação de atendimento' })).toBeTruthy();
    expect(screen.getByText('Olá! Como posso ajudar você hoje?')).toBeTruthy();
    expect(screen.getByPlaceholderText('Escreva ou envie um áudio')).toBeTruthy();
    expect(screen.getByText('Orientação não substitui avaliação médica.')).toBeTruthy();
  });

  it('com ?topic=sintomas pergunta o que a pessoa sente', async () => {
    mockedParams.mockReturnValue({ topic: 'sintomas' });
    await render(<ConversasScreen />);
    expect(screen.getByText('O que você está sentindo e há quanto tempo?')).toBeTruthy();
  });

  it('enviar uma mensagem chama sendMessage e limpa o campo', async () => {
    await render(<ConversasScreen />);
    const input = screen.getByPlaceholderText('Escreva ou envie um áudio');

    await fireEvent.changeText(input, '  Estou com dor de garganta desde ontem.  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar mensagem' }));

    expect(sendMessage).toHaveBeenCalledWith('Estou com dor de garganta desde ontem.');
    expect(input.props.value).toBe('');
  });

  it('o microfone abre o assistente de voz', async () => {
    await render(<ConversasScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Falar com o assistente por voz' }));
    expect(mockedRouter.push).toHaveBeenCalledWith('/assistente');
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('pergunta fechada mostra "Sim" e "Não", que enviam a resposta', async () => {
    mockedHook.mockReturnValue(assistant({ state: 'listening', transcript: DESIGN_TRANSCRIPT }));
    await render(<ConversasScreen />);

    expect(screen.getByText('Você está com dificuldade para respirar?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Sim' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Não' }));

    expect(sendMessage).toHaveBeenNthCalledWith(1, 'Sim');
    expect(sendMessage).toHaveBeenNthCalledWith(2, 'Não');
  });

  it('não mostra respostas rápidas para pergunta aberta nem enquanto pensa', async () => {
    await render(<ConversasScreen />);
    expect(screen.queryByRole('button', { name: 'Sim' })).toBeNull();

    mockedHook.mockReturnValue(assistant({ state: 'thinking', transcript: DESIGN_TRANSCRIPT }));
    await render(<ConversasScreen />);
    expect(screen.queryByRole('button', { name: 'Sim' })).toBeNull();
    expect(screen.getByLabelText('O assistente está escrevendo')).toBeTruthy();
  });

  it('cartão de sugestão navega para a tela indicada', async () => {
    mockedHook.mockReturnValue(
      assistant({ state: 'listening', suggestedAction: { kind: 'vacinacao', label: 'Ver locais de vacinação' } }),
    );
    await render(<ConversasScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Ver locais de vacinação' }));
    expect(mockedRouter.push).toHaveBeenCalledWith('/vacinacao');
  });

  it('emergência oferece ligar para o SAMU 192', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    mockedHook.mockReturnValue(
      assistant({
        state: 'listening',
        suggestedAction: { kind: 'cuidar-saude', emergency: true, label: 'Ligue 192 (SAMU) agora' },
      }),
    );
    await render(<ConversasScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Ligar 192 (SAMU)' }));
    expect(openURL).toHaveBeenCalledWith('tel:192');
  });

  it('voltar sem histórico vai para o Início', async () => {
    await render(<ConversasScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(mockedRouter.navigate).toHaveBeenCalledWith('/');
  });
});

describe('isYesNoQuestion', () => {
  it.each([
    ['Você está com dificuldade para respirar?', true],
    ['Entendi. Tem febre?', true],
    ['O que você está sentindo e há quanto tempo?', false],
    ['A dor é leve, moderada ou forte?', false],
    ['Vou procurar unidades perto de você.', false],
  ])('%s -> %s', (text, expected) => {
    expect(isYesNoQuestion(text)).toBe(expected);
  });
});
