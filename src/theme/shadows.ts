import type { ViewStyle } from 'react-native';

/** Sombras suaves; o design usa bordas finas e quase nenhuma elevação. */
export const shadows = {
  card: {
    boxShadow: '0px 2px 8px rgba(11, 27, 46, 0.04)',
  },
  tabBar: {
    boxShadow: '0px -1px 0px rgba(11, 27, 46, 0.06)',
  },
  primary: {
    boxShadow: '0px 6px 16px rgba(14, 92, 102, 0.18)',
  },
} as const satisfies Record<string, ViewStyle>;
