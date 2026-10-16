/**
 * Hooks e tipos das preferências. Não importa o AsyncStorage, então pode ser
 * usado em qualquer componente (e nos testes deles) sem mock. O provider fica em
 * `@/features/settings/SettingsProvider`.
 */
export * from './types';
export { contrastTextColor, HIGH_CONTRAST_TEXT, resolveTextStyle } from './text-style';
export { applyPatch, firstName, greeting, nearestFontScale, sanitizeName, sanitizeSettings, stepFontScale } from './logic';
export {
  HIGH_CONTRAST_OVERRIDES,
  scaleTypography,
  SettingsContext,
  useContrastColors,
  useAccessibleTextStyle,
  useFontScale,
  useHighContrast,
  useReadAloud,
  useScaledSize,
  useScaledTypography,
  useSettings,
  useShouldReduceMotion,
  type AppColors,
  type SettingsContextValue,
} from './context';
