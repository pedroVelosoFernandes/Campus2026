import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { colors } from '@/theme';

/**
 * Cores de texto trocadas no modo de alto contraste. Todas passam de 4,5:1
 * (WCAG AA) sobre o branco, o menta e o cinza-azulado dos balões.
 */
export const HIGH_CONTRAST_TEXT: Readonly<Record<string, string>> = {
  [colors.textBody]: colors.textHeading,
  [colors.textSecondary]: '#2F3644',
  [colors.textMuted]: '#4A5160',
  [colors.tabInactive]: '#3F4450',
  [colors.info]: '#1A64A0',
  [colors.danger]: '#B3332F',
  [colors.dangerText]: '#B3332F',
  [colors.dangerPressed]: '#B3332F',
  [colors.notification]: '#B3332F',
  [colors.primaryBright]: colors.primary,
};

const HIGH_CONTRAST_LOOKUP = new Map(
  Object.entries(HIGH_CONTRAST_TEXT).map(([from, to]) => [from.toUpperCase(), to]),
);

/** Cor equivalente no alto contraste (a própria cor quando não há troca). */
export function contrastTextColor(color: string): string {
  return HIGH_CONTRAST_LOOKUP.get(color.toUpperCase()) ?? color;
}

/** Medidas do texto que acompanham o tamanho escolhido (inclui a altura reservada para N linhas). */
const SCALED_KEYS = ['fontSize', 'lineHeight', 'minHeight'] as const;

/**
 * Aplica as preferências de Acessibilidade a um estilo de texto: multiplica
 * tamanho e entrelinha pela escala e escurece as cores secundárias no alto
 * contraste. Sem ajustes, devolve o estilo original (sem custo).
 */
export function resolveTextStyle(
  style: StyleProp<TextStyle>,
  scale: number,
  highContrast: boolean,
): StyleProp<TextStyle> {
  if (scale === 1 && !highContrast) return style;
  const flat = StyleSheet.flatten(style) ?? {};
  const next: { -readonly [K in keyof TextStyle]: TextStyle[K] } = { ...flat };
  if (scale !== 1) {
    for (const key of SCALED_KEYS) {
      const value = flat[key];
      if (typeof value === 'number') next[key] = Math.round(value * scale);
    }
  }
  if (highContrast && typeof flat.color === 'string') next.color = contrastTextColor(flat.color);
  return next;
}
