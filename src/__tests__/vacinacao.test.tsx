import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import VacinacaoScreen from '@/app/(tabs)/(inicio)/vacinacao';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('react-native-maps', () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const MapView = forwardRef(function MockMapView(props: { children?: React.ReactNode }, ref) {
    useImperativeHandle(ref, () => ({ animateToRegion: jest.fn() }));
    return <View testID="map">{props.children}</View>;
  });
  const Marker = (props: { children?: React.ReactNode; coordinate: { latitude: number } }) => (
    <View testID={`marker-${props.coordinate.latitude}`}>{props.children}</View>
  );
  return { __esModule: true, default: MapView, Marker };
});

const mockedParams = jest.mocked(useLocalSearchParams);

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <VacinacaoScreen />
    </SafeAreaProvider>,
  );

describe('Tela Vacinação perto de você', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedParams.mockReturnValue({});
  });

  it('mostra os textos do design com a unidade padrão', async () => {
    await renderScreen();

    expect(await screen.findByText('UBS do seu bairro')).toBeTruthy();
    expect(screen.getByText('Onde buscar atendimento')).toBeTruthy();
    expect(screen.getByText('Vacinação perto de você')).toBeTruthy();
    expect(screen.getByText('Exemplo de unidade')).toBeTruthy();
    expect(screen.getByText('Vacinação e atenção básica')).toBeTruthy();
    expect(screen.getByText('Confirme horários e disponibilidade.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Como chegar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver outras unidades' })).toBeTruthy();
    expect(screen.getByText('Antes de sair')).toBeTruthy();
    expect(screen.getByText('Leve documento e carteira de vacinação.')).toBeTruthy();
    expect(screen.getByText(/Confirme pelo Disque Saúde 136/)).toBeTruthy();
  });

  it('"Como chegar" abre o app de mapas com as coordenadas da unidade', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderScreen();
    await screen.findByText('UBS do seu bairro');

    await fireEvent.press(screen.getByRole('button', { name: 'Como chegar' }));

    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL.mock.calls[0][0]).toMatch(/maps.*-15\.7955,-47\.884/);
  });

  it('a lista de outras unidades troca a unidade do cartão', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderScreen();
    await screen.findByText('UBS do seu bairro');
    expect(screen.queryByText('Outras unidades')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Ver outras unidades' }));
    expect(screen.getByText('Outras unidades')).toBeTruthy();
    expect(screen.getByText('Av. Central, 455 — Vila Nova')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: /^UBS Vila Nova, UBS · 1,9 km/ }));

    const card = screen.getByLabelText(/^UBS Vila Nova\. /);
    expect(within(card).getByText('Vacinação e atenção básica')).toBeTruthy();
    expect(screen.queryByText('UBS do seu bairro')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Como chegar' }));
    expect(openURL.mock.calls[0][0]).toContain('-15.781,-47.871');
  });

  it('com servico=ubs mostra a UBS de referência e orientações da consulta de rotina', async () => {
    mockedParams.mockReturnValue({ servico: 'ubs' });
    await renderScreen();

    expect(await screen.findByText('UBS de referência perto de você')).toBeTruthy();
    expect(screen.queryByText('Vacinação perto de você')).toBeNull();
    expect(screen.getByText('Leve Cartão SUS, documento com foto e comprovante de residência.')).toBeTruthy();
    expect(screen.getByText('UBS do seu bairro')).toBeTruthy();
    expect(screen.getByText('Atenção básica e vacinação')).toBeTruthy();
  });

  it('o chevron volta', async () => {
    await renderScreen();
    await screen.findByText('UBS do seu bairro');
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(router.back).toHaveBeenCalled();
  });
});
