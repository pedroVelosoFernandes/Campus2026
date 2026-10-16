import { Text, type TextProps } from 'react-native';

import { useAccessibleTextStyle } from '@/features/settings';

export type AppTextProps = TextProps;

/**
 * Maior aumento vindo do tamanho de texto do sistema, além da escala do app.
 * Acima disso os cartões e a barra de abas deixam de caber na tela.
 */
const MAX_SYSTEM_MULTIPLIER = 1.5;

/**
 * Texto do app: mesmo uso do `Text` do React Native, mas segue o tamanho do
 * texto e o alto contraste escolhidos em Perfil > Acessibilidade.
 */
export function AppText({ style, maxFontSizeMultiplier = MAX_SYSTEM_MULTIPLIER, ...rest }: AppTextProps) {
  const resolved = useAccessibleTextStyle(style);
  return <Text {...rest} maxFontSizeMultiplier={maxFontSizeMultiplier} style={resolved} />;
}
