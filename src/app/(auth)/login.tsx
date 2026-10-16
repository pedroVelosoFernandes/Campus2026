import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { MessageSquareText } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { InfoNote } from '@/components/InfoNote';
import { ScreenHeader } from '@/components/ScreenHeader';
import { GuestOption } from '@/components/auth/GuestOption';
import { leaveAuthFlow } from '@/components/auth/navigation';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { DEMO_OTP_CODE, normalizeBrMobile, useAuth } from '@/features/auth';
import { setPendingLogin } from '@/features/auth/pending-login';
import { colors, screenPadding, spacing, typography } from '@/theme';

export default function LoginScreen() {
  const { requestCode, continueAsGuest, isDemo } = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const valid = normalizeBrMobile(phone) !== null;
  const canGoBack = router.canGoBack();

  const send = async () => {
    if (!valid || sending) return;
    setSending(true);
    setError(null);
    const result = await requestCode(phone).finally(() => setSending(false));
    if (!result.ok) {
      setError(result.error);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    setPendingLogin({ phone, retryAfterSeconds: result.retryAfterSeconds, hint: result.hint });
    router.push('/codigo');
  };

  const changePhone = (text: string) => {
    setPhone(text);
    setError(null);
  };

  const guest = async () => {
    await continueAsGuest();
    leaveAuthFlow();
  };

  return (
    <SafeAreaView style={styles.safe}>
      {canGoBack ? <ScreenHeader onBack={() => router.back()} /> : <View style={styles.topSpacer} />}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <AppText style={styles.title} accessibilityRole="header">
              Entre com seu celular
            </AppText>
            <AppText style={styles.subtitle}>
              Com uma conta, você guarda seu histórico de conversas e seu perfil. Enviamos um código por SMS.
            </AppText>
          </View>

          <View style={styles.form}>
            <PhoneInput value={phone} onChangeText={changePhone} onSubmitEditing={send} invalid={!!error} />
            {error ? (
              <AppText style={styles.error} accessibilityRole="alert">
                {error}
              </AppText>
            ) : null}
            <Button
              label={sending ? 'Enviando…' : 'Receber código por SMS'}
              icon={MessageSquareText}
              onPress={send}
              disabled={!valid || sending}
            />
          </View>

          {isDemo ? (
            <InfoNote
              title="Modo demonstração"
              message={`Nenhum SMS é enviado. Na próxima tela, use o código ${DEMO_OTP_CODE}.`}
            />
          ) : null}

          <GuestOption onPress={guest} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  topSpacer: { height: spacing.xxl },
  content: { paddingHorizontal: screenPadding, paddingTop: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.xxl },
  intro: { gap: spacing.sm, paddingHorizontal: spacing.xs },
  title: { ...typography.display, color: colors.textHeading },
  subtitle: { ...typography.bodyLarge, color: colors.textSecondary },
  form: { gap: spacing.lg },
  error: { ...typography.caption, color: colors.dangerPressed, paddingHorizontal: spacing.xs, marginTop: -spacing.sm },
});
