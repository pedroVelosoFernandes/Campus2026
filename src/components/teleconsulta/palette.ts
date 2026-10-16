import { colors } from '@/theme';

/**
 * Paleta da ilustração da teleconsulta, amostrada de docs/design/06-teleconsulta.png.
 * Restrita a este desenho; tokens do tema são reaproveitados quando coincidem.
 */
export const art = {
  backdrop: '#EEF5F8',
  backdropDeep: '#E4EFF4',
  ground: '#EDF3F6',
  outline: '#1F3A4D',
  screen: '#E6F1F6',
  screenGlow: '#F2F8FB',
  dot: '#5FA4C6',
  cameraTag: '#86BDD2',
  stand: '#C4DFEA',
  hair: '#1E3850',
  skin: '#F1B898',
  skinShade: '#E3A07F',
  cheek: '#EE9F8A',
  feature: '#2B2F3A',
  coat: colors.surface,
  coatShade: '#E3ECF1',
  scrub: '#8DC7DA',
  pipScreen: '#D9EAF2',
  shirt: '#3F8197',
  leaf: '#8DC2AE',
  leafDeep: '#72AE97',
  pot: '#CFE5EE',
  potRim: '#BCDAE6',
} as const;
