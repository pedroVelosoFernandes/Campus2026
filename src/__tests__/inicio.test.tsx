import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import InicioScreen from '@/app/(tabs)/(inicio)/index';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));

const mockedRouter = jest.mocked(router);

describe('Tela Início', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mostra saudação, título, ações e atalhos do design', async () => {
    await render(<InicioScreen />);

    expect(screen.getByText('Olá, Ana')).toBeTruthy();
    expect(screen.getByText('Como podemos ajudar?')).toBeTruthy();
    expect(screen.getByText('Conte o que você precisa, por voz ou texto.')).toBeTruthy();
    expect(screen.getByText('Conversar agora')).toBeTruthy();
    expect(screen.getByText('Prefiro escrever')).toBeTruthy();
    expect(screen.getByText('Atalhos')).toBeTruthy();
    expect(screen.getByText('Vacinas')).toBeTruthy();
    expect(screen.getByText('Consulta de rotina')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Notificações/ })).toBeTruthy();
  });

  it('"Conversar agora" e o orbe abrem o assistente de voz', async () => {
    await render(<InicioScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Conversar agora' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Falar com o assistente por voz' }));

    expect(mockedRouter.push).toHaveBeenNthCalledWith(1, '/assistente');
    expect(mockedRouter.push).toHaveBeenNthCalledWith(2, '/assistente');
  });

  it('"Prefiro escrever" vai para Conversas', async () => {
    await render(<InicioScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Prefiro escrever' }));
    expect(mockedRouter.navigate).toHaveBeenCalledWith('/conversas');
  });

  it('atalhos levam a vacinação e consulta de rotina', async () => {
    await render(<InicioScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Vacinas' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Consulta de rotina' }));

    expect(mockedRouter.push).toHaveBeenNthCalledWith(1, '/vacinacao');
    expect(mockedRouter.push).toHaveBeenNthCalledWith(2, '/cuidar-saude');
  });

  it('o sino não navega', async () => {
    await render(<InicioScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /Notificações/ }));
    expect(mockedRouter.push).not.toHaveBeenCalled();
    expect(mockedRouter.navigate).not.toHaveBeenCalled();
  });
});
