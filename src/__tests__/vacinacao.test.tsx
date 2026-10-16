import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import * as ExpoLocation from 'expo-location';

import VacinacaoScreen from '@/app/(tabs)/(inicio)/vacinacao';
import { authFetch } from '@/features/location/auth-fetch';
import { resetLocationSession } from '@/features/location/manual-place';

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
  const Polygon = () => null;
  return { __esModule: true, default: MapView, Marker, Polygon };
});

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(async () => null),
  reverseGeocodeAsync: jest.fn(async () => []),
  geocodeAsync: jest.fn(async () => []),
}));

jest.mock('@/features/location/auth-fetch', () => ({ authFetch: jest.fn() }));

const mockedParams = jest.mocked(useLocalSearchParams);
const location = jest.mocked(ExpoLocation);
const permission = (status: 'granted' | 'denied' | 'undetermined') =>
  ({ status, granted: status === 'granted', canAskAgain: true, expires: 'never' }) as never;
/** Ponto de GPS dentro do bairro de demonstração. */
const GPS = { coords: { latitude: -15.7941, longitude: -47.8829 } } as never;

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
    resetLocationSession();
    mockedParams.mockReturnValue({});
    // Padrão: localização negada → o app segue com o ponto aproximado do bairro.
    location.getForegroundPermissionsAsync.mockResolvedValue(permission('denied'));
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

  it('sem localização mostra o aviso de local aproximado', async () => {
    await renderScreen();
    expect(await screen.findByText('Local aproximado. Confirme pelo Disque Saúde 136 antes de ir.')).toBeTruthy();
  });
});

describe('Localização do aparelho na tela de vacinação', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetLocationSession();
    mockedParams.mockReturnValue({});
  });

  it('explica antes de pedir a permissão e usa o GPS depois de permitido', async () => {
    location.getForegroundPermissionsAsync.mockResolvedValue(permission('undetermined'));
    location.requestForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
    await renderScreen();

    expect(await screen.findByText('Usar sua localização?')).toBeTruthy();
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();

    location.getForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
    location.getCurrentPositionAsync.mockResolvedValue(GPS);
    await fireEvent.press(screen.getByRole('button', { name: 'Permitir localização' }));

    expect(await screen.findByText('UBS do seu bairro')).toBeTruthy();
    expect(location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    // Posição real: some o "Local aproximado".
    expect(screen.getByText('Dados de exemplo. Confirme pelo Disque Saúde 136 antes de ir.')).toBeTruthy();
    expect(screen.queryByText(/Local aproximado/)).toBeNull();
  });

  it('"Agora não" segue com o ponto aproximado, sem pedir permissão', async () => {
    location.getForegroundPermissionsAsync.mockResolvedValue(permission('undetermined'));
    await renderScreen();
    await fireEvent.press(await screen.findByRole('button', { name: 'Agora não' }));

    expect(await screen.findByText('UBS do seu bairro')).toBeTruthy();
    expect(screen.getByText(/Local aproximado/)).toBeTruthy();
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('Tela de vacinação com dados oficiais (CNES)', () => {
  const fetchMock = jest.mocked(authFetch);
  const cnesUnit = {
    id: 'cnes-10707',
    name: 'UBS 1 Asa Norte',
    type: 'UBS',
    address: 'Sqn 114 — Asa Norte',
    coordinates: { latitude: -15.7733, longitude: -47.8926 },
    services: ['ubs', 'consulta_rotina', 'vacinacao'],
    hours: 'Manhã e tarde (confirme o horário)',
    howToAccess: 'Leve documento.',
    distanceKm: 2.4,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetLocationSession();
    mockedParams.mockReturnValue({});
    process.env.EXPO_PUBLIC_API_URL = 'https://api.exemplo';
  });
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  it('sem permissão pede a cidade e busca as unidades oficiais dela', async () => {
    location.getForegroundPermissionsAsync.mockResolvedValue(permission('denied'));
    location.geocodeAsync.mockResolvedValue([{ latitude: -15.79, longitude: -47.88 }] as never);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ servico: 'vacinacao', units: [cnesUnit], usedLocation: true, notice: 'CNES', dataSource: 'cnes' }),
    } as Response);
    await renderScreen();

    expect(await screen.findByText('Em qual cidade você está?')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Cidade e estado'), 'Brasília, DF');
    await fireEvent.press(screen.getByRole('button', { name: 'Buscar unidades' }));

    expect(await screen.findByText('UBS 1 Asa Norte')).toBeTruthy();
    expect(screen.getByText('Unidade do SUS')).toBeTruthy();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.exemplo/api/health-units');
    expect(JSON.parse(String(init?.body))).toMatchObject({ servico: 'vacinacao', place: { city: 'Brasília', uf: 'DF' } });
  });

  it('busca vazia explica a limitação e oferece o Disque Saúde', async () => {
    location.getForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
    location.getCurrentPositionAsync.mockResolvedValue(GPS);
    location.reverseGeocodeAsync.mockResolvedValue([{ city: 'Brasília', region: 'DF', isoCountryCode: 'BR' }] as never);
    fetchMock.mockResolvedValue({ ok: false, status: 502 } as Response);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderScreen();

    expect(await screen.findByText('Nenhuma unidade encontrada')).toBeTruthy();
    expect(screen.getByText(/Não consegui consultar a base oficial/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Ligar para o Disque Saúde 136' }));
    expect(openURL).toHaveBeenCalledWith('tel:136');
  });
});
