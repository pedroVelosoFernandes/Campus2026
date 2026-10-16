import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import CuidarSaudeScreen from '@/app/(tabs)/(inicio)/cuidar-saude';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    navigate: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
}));

const mockedRouter = jest.mocked(router);

describe('Tela "Como você quer cuidar da saúde?"', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mostra título, subtítulo e as quatro opções do design', async () => {
    await render(<CuidarSaudeScreen />);

    expect(screen.getByRole('header', { name: 'Como você quer cuidar da saúde?' })).toBeTruthy();
    expect(screen.getByText('Escolha uma opção para continuar.')).toBeTruthy();
    for (const name of [
      'Teleconsulta. Ver opções pelo SUS',
      'Vacinação. Encontre uma unidade',
      'Estou com sintomas. Receba orientação de atendimento',
      'Consulta de rotina. Planeje seu próximo cuidado',
    ]) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });

  it.each([
    ['Teleconsulta', '/teleconsulta'],
    ['Vacinação', '/vacinacao'],
    ['Consulta de rotina', '/vacinacao?servico=ubs'],
  ])('"%s" abre %s', async (title, href) => {
    await render(<CuidarSaudeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${title}\\.`) }));
    expect(mockedRouter.push).toHaveBeenCalledWith(href);
  });

  it('"Estou com sintomas" abre Conversas com o tema de sintomas', async () => {
    await render(<CuidarSaudeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /^Estou com sintomas/ }));
    expect(mockedRouter.navigate).toHaveBeenCalledWith('/conversas?topic=sintomas');
    expect(mockedRouter.push).not.toHaveBeenCalled();
  });

  it('o chevron volta para a tela anterior', async () => {
    await render(<CuidarSaudeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(mockedRouter.back).toHaveBeenCalledTimes(1);
  });
});
