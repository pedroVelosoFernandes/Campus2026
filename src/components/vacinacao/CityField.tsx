import { memo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

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
      <TextInput
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
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
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
  error: { ...typography.caption, fontSize: 13, color: colors.danger },
});
