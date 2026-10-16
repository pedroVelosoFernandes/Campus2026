import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { AppTextInput } from '@/components/AppTextInput';
import { colors, fontFamily, radii, spacing, typography } from '@/theme';

export type CityFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  error?: string | null;
};

/** Campo "Cidade e estado" usado quando não há localização. */
function CityFieldBase({ value, onChangeText, onSubmit, error }: CityFieldProps) {
  return (
    <View style={styles.wrap}>
      <AppTextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder="Ex.: Campinas, SP"
        placeholderTextColor={colors.textMuted}
        accessibilityLabel="Cidade e estado"
        accessibilityHint="Digite a cidade e a sigla do estado, separadas por vírgula"
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="search"
        textContentType="addressCity"
        style={[styles.input, error ? styles.inputError : null]}
      />
      {error ? (
        <AppText style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export const CityField = memo(CityFieldBase);

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  input: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.mint,
    fontFamily: fontFamily.regular,
    fontSize: 17,
    color: colors.textHeading,
  },
  inputError: { borderColor: colors.danger },
  error: { ...typography.caption, fontSize: 13, color: colors.dangerText },
});
