/**
 * Paleta amostrada de docs/design/telas.png.
 * Nomes descrevem a função do token, não a cor.
 */
export const colors = {
  background: '#FCFDFD',
  surface: '#FFFFFF',
  border: '#E3E9ED',
  borderStrong: '#CFD8DE',

  primary: '#0E5C66',
  primaryPressed: '#0A4950',
  primaryBright: '#1F9C9E',
  glowOuter: '#EDF9F8',
  glowInner: '#D3F3F0',
  glowRim: '#BDEDE6',
  orbCenter: '#A4EEE3',
  onPrimary: '#FFFFFF',

  mint: '#F0F7F8',
  mintStrong: '#D9EEEC',
  iconTile: '#DCEDFA',
  iconTileForeground: '#1F6F86',
  /** Degradê vertical sutil dos quadrados de ícone (topo → base). */
  iconTileTop: '#E8F3FC',
  iconTileBottom: '#D3E7F7',

  /** Véu translúcido sobre o mapa (tira o bege do Apple Maps). */
  mapTint: 'rgba(214, 228, 228, 0.3)',

  avatarSurface: '#E6EDF3',
  avatarPerson: '#1D4A62',

  textHeading: '#0B1B2E',
  textBody: '#2A3140',
  textSecondary: '#5D6472',
  textMuted: '#8A909B',

  bubbleAssistant: '#ECF0F5',
  bubbleUser: '#D9EEEC',

  infoSurface: '#EAF4F8',
  info: '#2581CA',

  danger: '#E8605C',
  dangerPressed: '#C94D4F',
  notification: '#E5524E',

  tabInactive: '#6B6F78',
} as const;

export type ColorToken = keyof typeof colors;
