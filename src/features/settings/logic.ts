import {
  DEFAULT_SETTINGS,
  FONT_SCALE_STEPS,
  type FontScale,
  type Settings,
  type SettingsPatch,
} from './types';

type Raw = Record<string, unknown>;

const isObject = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function pickBooleans<T extends Record<string, boolean>>(defaults: T, raw: unknown): T {
  const source = isObject(raw) ? raw : {};
  const result = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const value = source[key as string];
    if (typeof value === 'boolean') result[key] = value as T[keyof T];
  }
  return result;
}

/** Aproxima qualquer número para o degrau válido mais próximo. */
export function nearestFontScale(value: unknown): FontScale {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_SETTINGS.accessibility.fontScale;
  return FONT_SCALE_STEPS.reduce((best, step) => (Math.abs(step - value) < Math.abs(best - value) ? step : best));
}

/** Um degrau acima (+1) ou abaixo (-1), limitado às pontas da escala. */
export function stepFontScale(current: FontScale, direction: 1 | -1): FontScale {
  const index = FONT_SCALE_STEPS.indexOf(current);
  const next = Math.min(FONT_SCALE_STEPS.length - 1, Math.max(0, (index < 0 ? 1 : index) + direction));
  return FONT_SCALE_STEPS[next];
}

/**
 * Valida o que veio do armazenamento: campos ausentes ou com tipo errado caem
 * no padrão, então uma versão antiga ou corrompida nunca quebra o app.
 */
export function sanitizeSettings(raw: unknown): Settings {
  const source = isObject(raw) ? raw : {};
  const { accessibility: defaultsA11y } = DEFAULT_SETTINGS;
  const a11yRaw = isObject(source.accessibility) ? source.accessibility : {};
  const { fontScale: _ignored, ...a11yToggles } = defaultsA11y;
  const referenceUnitId =
    typeof source.referenceUnitId === 'string' && source.referenceUnitId.trim()
      ? source.referenceUnitId
      : DEFAULT_SETTINGS.referenceUnitId;

  return {
    version: 1,
    notifications: pickBooleans(DEFAULT_SETTINGS.notifications, source.notifications),
    accessibility: {
      ...pickBooleans(a11yToggles, a11yRaw),
      fontScale: nearestFontScale(a11yRaw.fontScale ?? defaultsA11y.fontScale),
    },
    privacy: pickBooleans(DEFAULT_SETTINGS.privacy, source.privacy),
    referenceUnitId,
  };
}

/** Aplica uma alteração parcial sem mutar o objeto original. */
export function applyPatch(settings: Settings, patch: SettingsPatch): Settings {
  return sanitizeSettings({
    ...settings,
    referenceUnitId: patch.referenceUnitId ?? settings.referenceUnitId,
    notifications: { ...settings.notifications, ...patch.notifications },
    accessibility: { ...settings.accessibility, ...patch.accessibility },
    privacy: { ...settings.privacy, ...patch.privacy },
  });
}
