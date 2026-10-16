import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import TeleconsultaScreen from '@/app/(tabs)/(inicio)/teleconsulta';
import { MEU_SUS_DIGITAL_URL } from '@/components/teleconsulta/links';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'opened' })) }));

const mockedRouter = jest.mocked(router);
const mockedBrowser = jest.mocked(WebBrowser);

describe('Tela Teleconsulta', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mostra cabeçalho, ilustração, textos e ações do design', async () => {
    await render(<TeleconsultaScreen />);

    expect(screen.getByText('Teleconsulta')).toBeTruthy();
    expect(screen.getByLabelText(/médica atendendo um paciente por videochamada/)).toBeTruthy();
    expect(screen.getByText('Continue no canal do SUS')).toBeTruthy();
    expect(screen.getByText('Consulte os serviços digitais disponíveis na sua região.')).toBeTruthy();
    expect(screen.getByText('Você será direcionado para um serviço externo.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Consultar opções no SUS' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Voltar ao assistente' })).toBeTruthy();
  });

  it('"Consultar opções no SUS" abre a página oficial do Meu SUS Digital', async () => {
    await render(<TeleconsultaScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Consultar opções no SUS' }));

    expect(MEU_SUS_DIGITAL_URL).toMatch(/^https:\/\/www\.gov\.br\/saude\//);
    expect(mockedBrowser.openBrowserAsync).toHaveBeenCalledWith(MEU_SUS_DIGITAL_URL, expect.any(Object));
    expect(mockedRouter.push).not.toHaveBeenCalled();
  });

  it('"Voltar ao assistente" abre o assistente', async () => {
    await render(<TeleconsultaScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar ao assistente' }));
    expect(mockedRouter.push).toHaveBeenCalledWith('/assistente');
  });

  it('o chevron volta para a tela anterior', async () => {
    await render(<TeleconsultaScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(mockedRouter.back).toHaveBeenCalled();
  });
});
