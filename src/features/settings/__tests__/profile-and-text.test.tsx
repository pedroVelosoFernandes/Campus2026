import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import {
  applyPatch,
  contrastTextColor,
  DEFAULT_SETTINGS,
  firstName,
  greeting,
  resolveTextStyle,
  sanitizeName,
  sanitizeSettings,
  type Settings,
} from '@/features/settings';
import { SettingsProvider } from '@/features/settings/SettingsProvider';
import { colors } from '@/theme';

const withA11y = (accessibility: Partial<Settings['accessibility']>): Settings => ({
  ...DEFAULT_SETTINGS,
  accessibility: { ...DEFAULT_SETTINGS.accessibility, ...accessibility },
});

describe('nome e saudação', () => {
  it('saúda pelo primeiro nome ou só "Olá!" sem nome', () => {
    expect(greeting('')).toBe('Olá!');
    expect(greeting('   ')).toBe('Olá!');
    expect(greeting('Maria Clara Souza')).toBe('Olá, Maria');
    expect(firstName('  joão   pedro ')).toBe('joão');
  });

  it('limpa o nome: espaços, tipo errado e tamanho máximo', () => {
    expect(sanitizeName('  Ana   Paula  ')).toBe('Ana Paula');
    expect(sanitizeName(42)).toBe('');
    expect(sanitizeName('x'.repeat(80))).toHaveLength(40);
  });

  it('guarda o nome nas preferências e tolera dados antigos sem perfil', () => {
    expect(sanitizeSettings({ version: 1 }).profile).toEqual({ name: '', namePromptDone: false });
    const next = applyPatch(DEFAULT_SETTINGS, { profile: { name: ' Bia ', namePromptDone: true } });
    expect(next.profile).toEqual({ name: 'Bia', namePromptDone: true });
    expect(applyPatch(next, { profile: { name: '' } }).profile).toEqual({ name: '', namePromptDone: true });
  });
});

describe('texto acessível', () => {
  const base = { fontSize: 16, lineHeight: 22, minHeight: 36, color: colors.textSecondary };

  it('sem ajustes devolve o mesmo estilo', () => {
    expect(resolveTextStyle(base, 1, false)).toBe(base);
  });

  it('escala tamanho, entrelinha e altura reservada', () => {
    expect(resolveTextStyle(base, 1.45, false)).toMatchObject({ fontSize: 23, lineHeight: 32, minHeight: 52 });
  });

  it('alto contraste escurece as cores secundárias e mantém as demais', () => {
    expect(resolveTextStyle(base, 1, true)).toMatchObject({ color: '#2F3644', fontSize: 16 });
    expect(contrastTextColor(colors.textMuted)).toBe('#4A5160');
    expect(contrastTextColor(colors.primary)).toBe(colors.primary);
    expect(contrastTextColor(colors.textBody.toLowerCase())).toBe(colors.textHeading);
  });

  it('AppText segue a preferência do provider', async () => {
    await render(
      <SettingsProvider initialSettings={withA11y({ fontScale: 1.3, highContrast: true })}>
        <AppText style={{ fontSize: 20, lineHeight: 26, color: colors.textSecondary }}>Olá</AppText>
      </SettingsProvider>,
    );
    const style = StyleSheet.flatten(screen.getByText('Olá').props.style);
    expect(style).toMatchObject({ fontSize: 26, lineHeight: 34, color: '#2F3644' });
  });

  it('AppText sem provider fica no tamanho do design', async () => {
    await render(<AppText style={{ fontSize: 20 }}>Padrão</AppText>);
    expect(StyleSheet.flatten(screen.getByText('Padrão').props.style).fontSize).toBe(20);
  });
});
