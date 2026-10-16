import { createLocationService, type LocationApi } from '@/features/location/location-service';
import { createAssistantLocation } from '@/features/location/assistant-location';
import { resetLocationSession, setManualFix } from '@/features/location/manual-place';

jest.mock('expo-location', () => ({ Accuracy: { Balanced: 3 } }));

const position = (latitude: number, longitude: number) => ({ coords: { latitude, longitude } });

function fakeApi(overrides: Partial<Record<keyof LocationApi, jest.Mock>> = {}) {
  return {
    getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    getCurrentPositionAsync: jest.fn(async () => position(-15.79, -47.88)),
    getLastKnownPositionAsync: jest.fn(async () => null),
    reverseGeocodeAsync: jest.fn(async () => [{ city: 'Brasília', region: 'Distrito Federal', isoCountryCode: 'BR' }]),
    geocodeAsync: jest.fn(async () => [{ latitude: -22.9, longitude: -47.06 }]),
    ...overrides,
  } as unknown as LocationApi & Record<keyof LocationApi, jest.Mock>;
}

describe('serviço de localização', () => {
  beforeEach(resetLocationSession);

  it('GPS atual com cidade e UF pela geocodificação reversa', async () => {
    const fix = await createLocationService(fakeApi()).locate();
    expect(fix).toEqual({
      coordinates: { latitude: -15.79, longitude: -47.88 },
      approximate: false,
      source: 'gps',
      place: { city: 'Brasília', uf: 'DF' },
    });
  });

  it('sem sinal a tempo: usa a última posição conhecida e marca como aproximada', async () => {
    const api = fakeApi({
      getCurrentPositionAsync: jest.fn(() => new Promise(() => {})),
      getLastKnownPositionAsync: jest.fn(async () => position(-23.5, -46.6)),
    });
    const fix = await createLocationService(api, 10).locate();
    expect(fix).toMatchObject({ approximate: true, source: 'ultima-conhecida', coordinates: { latitude: -23.5 } });
  });

  it('sem permissão não consulta o GPS', async () => {
    const api = fakeApi({ getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })) });
    await expect(createLocationService(api).locate()).resolves.toBeNull();
    expect(api.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('cidade digitada vira ponto aproximado', async () => {
    const api = fakeApi();
    const fix = await createLocationService(api).fromCityText('Campinas, SP');
    expect(api.geocodeAsync).toHaveBeenCalledWith('Campinas, SP, Brasil');
    expect(fix).toMatchObject({ approximate: true, source: 'cidade-informada', place: { city: 'Campinas', uf: 'SP' } });
  });

  it('ignora endereço fora do Brasil', async () => {
    const api = fakeApi({ reverseGeocodeAsync: jest.fn(async () => [{ city: 'Lisboa', isoCountryCode: 'PT' }]) });
    await expect(createLocationService(api).reversePlace({ latitude: 38.7, longitude: -9.1 })).resolves.toBeNull();
  });
});

describe('localização do assistente', () => {
  beforeEach(resetLocationSession);

  it('pede a permissão só se nunca foi respondida e reaproveita a cidade do GPS', async () => {
    const api = fakeApi({ getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'undetermined' })) });
    const assistant = createAssistantLocation(createLocationService(api));
    api.requestForegroundPermissionsAsync.mockImplementation(async () => {
      api.getForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      return { status: 'granted' };
    });

    const coordinates = await assistant.getCoordinates();
    expect(coordinates).toEqual({ latitude: -15.79, longitude: -47.88 });
    expect(api.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    await expect(assistant.resolvePlace(coordinates)).resolves.toEqual({ city: 'Brasília', uf: 'DF' });
    expect(api.reverseGeocodeAsync).toHaveBeenCalledTimes(1);
  });

  it('negada: usa a cidade informada na tela, se houver', async () => {
    const api = fakeApi({ getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })) });
    const assistant = createAssistantLocation(createLocationService(api));
    await expect(assistant.getCoordinates()).resolves.toBeNull();
    expect(api.requestForegroundPermissionsAsync).not.toHaveBeenCalled();

    setManualFix({ coordinates: null, approximate: true, source: 'cidade-informada', place: { city: 'Recife', uf: 'PE' } });
    await expect(assistant.resolvePlace(null)).resolves.toEqual({ city: 'Recife', uf: 'PE' });
  });
});
