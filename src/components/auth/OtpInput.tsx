import { memo, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

import { AppText } from '@/components/AppText';
import { OTP_LENGTH } from '@/features/auth/phone';
import { colors, radii, spacing, typography } from '@/theme';

export type OtpInputProps = {
  value: string;
  onChange: (code: string) => void;
  /** Chamado quando os 6 dígitos estão preenchidos (digitados ou colados pelo iOS). */
  onComplete?: (code: string) => void;
  invalid?: boolean;
};

/**
 * Seis caixas sobre UM campo invisível: aceita o preenchimento automático do
 * código do SMS (iOS `oneTimeCode`, Android `sms-otp`) e colar.
 */
function OtpInputBase({ value, onChange, onComplete, invalid }: OtpInputProps) {
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(true);

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    onChange(digits);
    if (digits.length === OTP_LENGTH) onComplete?.(digits);
  };

  return (
    <Pressable onPress={() => input.current?.focus()} accessible={false} style={styles.wrap}>
      <View style={styles.row} pointerEvents="none">
        {Array.from({ length: OTP_LENGTH }, (_, index) => {
          const digit = value[index] ?? '';
          const active = focused && index === Math.min(value.length, OTP_LENGTH - 1);
          return (
            <View
              key={index}
              style={[styles.box, digit !== '' && styles.boxFilled, active && styles.boxActive, invalid && styles.boxInvalid]}>
              <AppText style={styles.digit}>{digit}</AppText>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={OTP_LENGTH}
        autoFocus
        caretHidden
        accessibilityLabel={`Código de ${OTP_LENGTH} números`}
        style={styles.hidden}
        testID="otp-input"
      />
    </Pressable>
  );
}

export const OtpInput = memo(OtpInputBase);

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  box: {
    flex: 1,
    maxWidth: 54,
    height: 62,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { borderColor: colors.border, backgroundColor: colors.mint },
  boxActive: { borderColor: colors.primaryBright, backgroundColor: colors.surface },
  boxInvalid: { borderColor: colors.danger },
  digit: { ...typography.title, fontSize: 26, color: colors.textHeading },
  hidden: { ...StyleSheet.absoluteFill, opacity: 0.015, color: 'transparent' },
});
