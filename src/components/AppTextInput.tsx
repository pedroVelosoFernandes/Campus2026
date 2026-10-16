import type { ComponentProps } from 'react';
import { TextInput } from 'react-native';

import { useAccessibleTextStyle } from '@/features/settings';

export type AppTextInputProps = ComponentProps<typeof TextInput>;

/** Campo de texto que segue o tamanho do texto e o alto contraste do app (como o `AppText`). */
export function AppTextInput({ style, maxFontSizeMultiplier = 1.5, ...rest }: AppTextInputProps) {
  const resolved = useAccessibleTextStyle(style);
  return <TextInput {...rest} maxFontSizeMultiplier={maxFontSizeMultiplier} style={resolved} />;
}
