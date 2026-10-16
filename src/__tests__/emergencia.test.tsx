import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert, Linking } from 'react-native';

import EmergenciaScreen from '@/app/(tabs)/(inicio)/emergencia';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

const mockedRouter = jest.mocked(router);

describe('Tela Emergência', () => {
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();
  });

  it('mostra os quatro telefones e os sinais de alerta', async () => {
    await render(<EmergenciaScreen />);

    expect(screen.getByRole('header', { name: 'Precisa de ajuda agora?' })).toBeTruthy();
    for (const name of ['SAMU', 'Bombeiros', 'CVV', 'Disque Saúde']) {
      expect(screen.getByRole('button', { name: new RegExp(`^Ligar para ${name}`) })).toBeTruthy();
    }
    expect(screen.getByRole('header', { name: 'Sinais de alerta' })).toBeTruthy();
    expect(screen.getByText('Dor ou aperto no peito')).toBeTruthy();
  });

  it.each([
    ['SAMU', '192'],
    ['Bombeiros', '193'],
    ['CVV', '188'],
    ['Disque Saúde', '136'],
  ])('o botão do %s liga para %s', async (name, number) => {
    await render(<EmergenciaScreen />);
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^Ligar para ${name}`) }));
    expect(openURL).toHaveBeenCalledWith(`tel:${number}`);
  });

  it('avisa quando o aparelho não consegue ligar', async () => {
    openURL.mockRejectedValueOnce(new Error('sem telefone'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(<EmergenciaScreen />);

    await fireEvent.press(screen.getByTestId('ligar-192'));

    expect(alert).toHaveBeenCalledWith('Não foi possível abrir o telefone', 'Disque 192 pelo seu celular.');
  });

  it('o chevron volta', async () => {
    await render(<EmergenciaScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(mockedRouter.back).toHaveBeenCalledTimes(1);
  });
});
