import type { TextStyle } from 'react-native';

/** Famílias carregadas em src/app/_layout.tsx (Figtree, @expo-google-fonts/figtree). */
export const fontFamily = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
} as const;

type Variant =
  | 'display'
  | 'title'
  | 'headline'
  | 'bodyLarge'
  | 'body'
  | 'bodyMedium'
  | 'label'
  | 'caption'
  | 'tab';

export const typography: Record<Variant, TextStyle> = {
  display: { fontFamily: fontFamily.bold, fontSize: 34, lineHeight: 40, letterSpacing: -0.4 },
  title: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.3 },
  headline: { fontFamily: fontFamily.semibold, fontSize: 18, lineHeight: 24 },
  bodyLarge: { fontFamily: fontFamily.regular, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 22 },
  bodyMedium: { fontFamily: fontFamily.medium, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fontFamily.semibold, fontSize: 17, lineHeight: 22 },
  caption: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 19 },
  tab: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16 },
};
