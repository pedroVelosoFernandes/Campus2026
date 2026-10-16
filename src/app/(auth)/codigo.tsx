import { router } from 'expo-router';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { InfoNote } from '@/components/InfoNote';
import { PressableScale } from '@/components/PressableScale';
import { ScreenHeader } from '@/components/ScreenHeader';
import { goBackOr } from '@/components/auth/navigation';
import { OtpInput } from '@/components/auth/OtpInput';
import { formatCountdown } from '@/components/auth/use-countdown';
import { useOtpFlow } from '@/components/auth/use-otp-flow';
import { formatBrPhone, isOtpCode } from '@/features/auth';
import { colors, screenPadding, spacing, typography } from '@/theme';

const backToLogin = () => goBackOr('/login');

function ResendRow({ remaining, onResend }: { remaining: number; onResend: () => void }) {
  return (
    <View style={styles.links}>
      {remaining > 0 ? (
        <Text style={styles.wait} accessibilityLiveRegion="polite">
          Reenviar código em {formatCountdown(remaining)}
        </Text>
      ) : (
        <PressableScale onPress={onResend} style={styles.link}>
          <Text style={styles.linkText}>Reenviar código</Text>
        </PressableScale>
      )}
      <PressableScale onPress={backToLogin} style={styles.link}>
        <Text style={styles.linkText}>Trocar número</Text>
      </PressableScale>
    </View>
  );
}

export default function CodigoScreen() {
  const { pending, code, changeCode, error, checking, remaining, confirm, resend } = useOtpFlow();

  if (!pending) {
    // Aberta sem um número em verificação (ex.: link direto): volta ao login.
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader onBack={backToLogin} />
        <View style={styles.content}>
          <Button label="Informar celular" onPress={() => router.replace('/login')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader onBack={backToLogin} backLabel="Trocar número" />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <Text style={styles.title} accessibilityRole="header">
              Digite o código
            </Text>
            <Text style={styles.subtitle}>
              Enviamos um SMS com 6 números para <Text style={styles.phone}>{formatBrPhone(pending.phone).replace(" ", "\u00A0")}</Text>.
            </Text>
          </View>

          <OtpInput value={code} onChange={changeCode} onComplete={confirm} invalid={!!error} />
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          {pending.hint ? <InfoNote message={pending.hint} /> : null}

          <ResendRow remaining={remaining} onResend={resend} />

          <Button
            label={checking ? 'Conferindo…' : 'Confirmar'}
            onPress={() => confirm(code)}
            disabled={!isOtpCode(code) || checking}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: screenPadding, paddingTop: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.xxl },
  intro: { gap: spacing.sm, paddingHorizontal: spacing.xs },
  title: { ...typography.display, color: colors.textHeading },
  subtitle: { ...typography.bodyLarge, color: colors.textSecondary },
  phone: { fontFamily: typography.label.fontFamily, color: colors.textHeading },
  error: { ...typography.caption, color: colors.dangerPressed, paddingHorizontal: spacing.xs, marginTop: -spacing.md },
  links: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wait: { ...typography.bodyMedium, fontSize: 15, color: colors.textMuted, paddingHorizontal: spacing.xs },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.xs },
  linkText: { ...typography.bodyMedium, fontSize: 15, color: colors.primary },
});
