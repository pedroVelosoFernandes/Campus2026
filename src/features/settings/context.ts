import { createContext, useContext, useMemo } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { colors, typography } from '@/theme';

import { resolveTextStyle } from './text-style';
import { DEFAULT_SETTINGS, type Settings, type SettingsPatch } from './types';

export type SettingsContextValue = {
  settings: Settings;
  /** `false` enquanto as preferências salvas são lidas. */
  ready: boolean;
  update: (patch: SettingsPatch) => void;
  /** Volta tudo ao padrão (usado por "Apagar meus dados"). */
  reset: () => void;
};

const noop = () => {};

/**
 * Sem provider (ex.: testes de componentes isolados) os hooks devolvem o
 * padrão, então qualquer componente pode consumi-los com segurança.
 */
export const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  ready: true,
  update: noop,
  reset: noop,
});

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}

/** Multiplicador do tamanho do texto escolhido em Acessibilidade (1 = design). */
export function useFontScale(): number {
  return useContext(SettingsContext).settings.accessibility.fontScale;
}

type TypographyMap = typeof typography;

/** Escala `fontSize` e `lineHeight` de cada variante, arredondando para pontos inteiros. */
export function scaleTypography<T extends Record<string, TextStyle>>(base: T, scale: number): T {
  if (scale === 1) return base;
  const entries = Object.entries(base).map(([key, style]) => [
    key,
    {
      ...style,
      ...(style.fontSize ? { fontSize: Math.round(style.fontSize * scale) } : null),
      ...(style.lineHeight ? { lineHeight: Math.round(style.lineHeight * scale) } : null),
    },
  ]);
  return Object.fromEntries(entries) as T;
}

/**
 * Tipografia do tema já escalada pela preferência do usuário. Para textos use o
 * `AppText` (que já escala); isto serve para medidas que dependem do texto.
 */
export function useScaledTypography(): TypographyMap {
  const scale = useFontScale();
  return useMemo(() => scaleTypography(typography, scale), [scale]);
}

/** Escala um tamanho avulso (ex.: `fontSize: 21` de um título específico). */
export function useScaledSize(): (size: number) => number {
  const scale = useFontScale();
  return useMemo(() => (size: number) => Math.round(size * scale), [scale]);
}

export function useHighContrast(): boolean {
  return useContext(SettingsContext).settings.accessibility.highContrast;
}

/**
 * Tons do alto contraste: textos com pelo menos 4,5:1 e bordas com pelo menos
 * 3:1 sobre o branco (WCAG AA para texto e para contornos de componentes).
 */
export const HIGH_CONTRAST_OVERRIDES = {
  textBody: colors.textHeading,
  textSecondary: '#2F3644',
  textMuted: '#4A5160',
  tabInactive: '#3F4450',
  border: '#7D8993',
  borderStrong: '#5F6B75',
  info: '#1A64A0',
} as const;

export type AppColors = { [K in keyof typeof colors]: string };

/** Paleta do tema com os ajustes de alto contraste quando ativado. */
export function useContrastColors(): AppColors {
  const high = useHighContrast();
  return useMemo(() => (high ? { ...colors, ...HIGH_CONTRAST_OVERRIDES } : colors), [high]);
}

/**
 * Estilo de texto com o tamanho e o contraste escolhidos em Acessibilidade.
 * O `AppText` já usa; chame direto só em campos (`TextInput`).
 */
export function useAccessibleTextStyle(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  const scale = useFontScale();
  const high = useHighContrast();
  return useMemo(() => resolveTextStyle(style, scale, high), [style, scale, high]);
}

export function useReadAloud(): boolean {
  return useContext(SettingsContext).settings.accessibility.readAloud;
}

/** `true` quando o sistema OU a preferência do app pedem menos animação. */
export function useShouldReduceMotion(): boolean {
  const system = useReducedMotion();
  const app = useContext(SettingsContext).settings.accessibility.reduceMotion;
  return system || app;
}
