import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import {
  applyPatch,
  DEFAULT_SETTINGS,
  nearestFontScale,
  sanitizeSettings,
  scaleTypography,
  stepFontScale,
  useScaledTypography,
  useSettings,
  type SettingsContextValue,
} from '@/features/settings';
import { SettingsProvider } from '@/features/settings/SettingsProvider';
import { loadSettings, SETTINGS_KEY } from '@/features/settings/storage';
import { typography } from '@/theme';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('lógica das preferências', () => {
  it('começa com histórico de conversas e localização desligados (LGPD)', () => {
    expect(DEFAULT_SETTINGS.privacy).toEqual({ saveConversationHistory: false, useLocation: false });
  });

  it('sanitiza dados antigos ou corrompidos campo a campo', () => {
    const result = sanitizeSettings({
      notifications: { vaccineReminders: false, campaignAlerts: 'sim' },
      accessibility: { fontScale: 1.33, highContrast: true },
      privacy: null,
      referenceUnitId: '',
    });
    expect(result.notifications).toEqual({ ...DEFAULT_SETTINGS.notifications, vaccineReminders: false });
    expect(result.accessibility.fontScale).toBe(1.3);
    expect(result.accessibility.highContrast).toBe(true);
    expect(result.privacy).toEqual(DEFAULT_SETTINGS.privacy);
    expect(result.referenceUnitId).toBe(DEFAULT_SETTINGS.referenceUnitId);
    expect(sanitizeSettings('lixo')).toEqual(DEFAULT_SETTINGS);
  });

  it('aproxima e limita os degraus do tamanho do texto', () => {
    expect(nearestFontScale(5)).toBe(1.45);
    expect(nearestFontScale(Number.NaN)).toBe(1);
    expect(stepFontScale(1, 1)).toBe(1.15);
    expect(stepFontScale(0.9, -1)).toBe(0.9);
    expect(stepFontScale(1.45, 1)).toBe(1.45);
  });

  it('aplica alterações parciais sem mutar o original', () => {
    const next = applyPatch(DEFAULT_SETTINGS, { accessibility: { readAloud: true }, referenceUnitId: 'ubs-vila-nova' });
    expect(next.accessibility.readAloud).toBe(true);
    expect(next.accessibility.fontScale).toBe(1);
    expect(next.referenceUnitId).toBe('ubs-vila-nova');
    expect(DEFAULT_SETTINGS.accessibility.readAloud).toBe(false);
  });

  it('escala tamanho e altura de linha da tipografia', () => {
    const scaled = scaleTypography(typography, 1.3);
    expect(scaled.body.fontSize).toBe(21);
    expect(scaled.body.lineHeight).toBe(29);
    expect(scaled.body.fontFamily).toBe(typography.body.fontFamily);
    expect(scaleTypography(typography, 1)).toBe(typography);
  });
});

describe('SettingsProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('lê o que estava salvo e persiste cada alteração', async () => {
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, accessibility: { ...DEFAULT_SETTINGS.accessibility, fontScale: 1.15 } }),
    );
    let ctx: SettingsContextValue | null = null;
    function Probe() {
      ctx = useSettings();
      const type = useScaledTypography();
      return <Text testID="probe" style={type.body}>{ctx.settings.accessibility.fontScale}</Text>;
    }

    await render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>,
    );

    expect(await screen.findByText('1.15')).toBeTruthy();
    expect(screen.getByTestId('probe')).toHaveStyle({ fontSize: 18 });

    await act(async () => ctx!.update({ notifications: { campaignAlerts: true } }));
    const saved = await loadSettings();
    expect(saved.notifications.campaignAlerts).toBe(true);
    expect(saved.accessibility.fontScale).toBe(1.15);
  });

  it('usa o padrão quando o armazenamento falha', async () => {
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('falhou'));
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
