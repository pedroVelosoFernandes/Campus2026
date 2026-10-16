/**
 * Preferências do app (Perfil). Persistidas localmente com AsyncStorage em
 * `storage.ts`; nada aqui sai do aparelho.
 */

/** Degraus do tamanho do texto (A- … A+). 1 = tamanho do design. */
export const FONT_SCALE_STEPS = [0.9, 1, 1.15, 1.3, 1.45] as const;
export type FontScale = (typeof FONT_SCALE_STEPS)[number];

/** Nome de cada degrau (falado pelo leitor de tela e mostrado sob o controle). */
export const FONT_SCALE_LABELS: Record<FontScale, string> = {
  0.9: 'Pequeno',
  1: 'Padrão',
  1.15: 'Médio',
  1.3: 'Grande',
  1.45: 'Muito grande',
};

export type NotificationPreferences = {
  vaccineReminders: boolean;
  appointmentReminders: boolean;
  campaignAlerts: boolean;
};

export type AccessibilityPreferences = {
  fontScale: FontScale;
  highContrast: boolean;
  /** Ler as respostas do assistente em voz alta (consumido pelo chat/assistente). */
  readAloud: boolean;
  /** Reduz animações além da configuração do sistema. */
  reduceMotion: boolean;
};

/** Consentimentos (LGPD): tudo que não é essencial começa desligado. */
export type PrivacyConsents = {
  saveConversationHistory: boolean;
  useLocation: boolean;
};

export type Settings = {
  version: 1;
  notifications: NotificationPreferences;
  accessibility: AccessibilityPreferences;
  privacy: PrivacyConsents;
  /** Id da unidade de referência (serviço de unidades de saúde). */
  referenceUnitId: string;
};

export const DEFAULT_REFERENCE_UNIT_ID = 'ubs-do-seu-bairro';

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  notifications: { vaccineReminders: true, appointmentReminders: true, campaignAlerts: false },
  accessibility: { fontScale: 1, highContrast: false, readAloud: false, reduceMotion: false },
  privacy: { saveConversationHistory: false, useLocation: false },
  referenceUnitId: DEFAULT_REFERENCE_UNIT_ID,
};

export type SettingsSection = 'notifications' | 'accessibility' | 'privacy';

/** Alteração parcial de uma seção, ex.: `{ accessibility: { readAloud: true } }`. */
export type SettingsPatch = {
  [K in SettingsSection]?: Partial<Settings[K]>;
} & { referenceUnitId?: string };
