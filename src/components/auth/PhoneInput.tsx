import { memo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { formatBrPhone } from '@/features/auth/phone';
import { colors, radii, spacing, typography } from '@/theme';

export type PhoneInputProps = {
  value: string;
  onChangeText: (formatted: string) => void;
  onSubmitEditing?: () => void;
  invalid?: boolean;
};

/** Campo de celular com +55 fixo e máscara `(11) 98765-4321`. */
function PhoneInputBase({ value, onChangeText, onSubmitEditing, invalid }: PhoneInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label} nativeID="phone-label">
        Celular com DDD
      </Text>
      <View style={[styles.field, focused && styles.fieldFocused, invalid && styles.fieldInvalid]}>
        <View style={styles.prefix}>
          <Text style={styles.prefixText}>+55</Text>
        </View>
        <TextInput
          value={value}
          onChangeText={(text) => onChangeText(formatBrPhone(text))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          placeholder="(11) 98765-4321"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel-national"
          returnKeyType="next"
          maxLength={15}
          accessibilityLabel="Celular com DDD"
          accessibilityLabelledBy="phone-label"
          style={styles.input}
          testID="phone-input"
        />
      </View>
    </View>
  );
}

export const PhoneInput = memo(PhoneInputBase);

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { ...typography.bodyMedium, fontSize: 15, color: colors.textBody, paddingHorizontal: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fieldFocused: { borderColor: colors.primaryBright },
  fieldInvalid: { borderColor: colors.danger },
  prefix: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.mint,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  prefixText: { ...typography.label, color: colors.textHeading },
  input: { flex: 1, ...typography.bodyLarge, fontSize: 19, color: colors.textHeading, paddingHorizontal: spacing.lg, letterSpacing: 0.3 },
});
