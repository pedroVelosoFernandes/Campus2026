import * as Haptics from 'expo-haptics';
import { Redirect, router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { ConsentCheckbox } from '@/components/onboarding/ConsentCheckbox';
import { OnboardingPager } from '@/components/onboarding/OnboardingPager';
import { PaginationDots } from '@/components/onboarding/PaginationDots';
import { GuidanceArt, PrivacyArt, VoiceTextArt } from '@/components/onboarding/illustrations';
import { openLegalDocument } from '@/components/auth/legal-links';
import { useAuth } from '@/features/auth';
import { colors, screenPadding, spacing, typography } from '@/theme';

const SLIDES = [
  {
    art: <VoiceTextArt />,
    title: 'Converse por voz ou texto',
    body: 'Conte o que você precisa do seu jeito. O assistente entende a linguagem do dia a dia e responde falando ou por escrito.',
  },
  {
    art: <GuidanceArt />,
    title: 'Orientação para usar o SUS',
    body: 'Indicamos o serviço certo, onde fica e o que levar. O Alô Saúde não substitui médico nem faz diagnóstico. Em emergência, ligue 192 (SAMU).',
  },
  {
    art: <PrivacyArt />,
    title: 'Seus dados protegidos',
    body: 'Usamos só o necessário para orientar você, conforme a LGPD. A localização é usada apenas quando você permite.',
  },
] as const;

const LAST = SLIDES.length - 1;

function Slide({ art, title, body, children }: { art: ReactNode; title: string; body: string; children?: ReactNode }) {
  return (
    <View style={styles.slide}>
      <View style={styles.art}>{art}</View>
      <View style={styles.texts}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      {children}
    </View>
  );
}

function ConsentBlock({ accepted, onChange }: { accepted: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.consent}>
      <ConsentCheckbox
        checked={accepted}
        onChange={onChange}
        label="Li e aceito os Termos de uso e a Política de privacidade."
      />
      <View style={styles.links}>
        <PressableScale onPress={() => openLegalDocument('termos')} accessibilityRole="link" style={styles.link}>
          <Text style={styles.linkText}>Termos de uso</Text>
        </PressableScale>
        <Text style={styles.linkDot}>·</Text>
        <PressableScale onPress={() => openLegalDocument('privacidade')} accessibilityRole="link" style={styles.link}>
          <Text style={styles.linkText}>Política de privacidade</Text>
        </PressableScale>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const { completeOnboarding, onboardingDone } = useAuth();
  const [page, setPage] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const progress = useSharedValue(0);
  const isLast = page === LAST;

  const next = async () => {
    if (!isLast) {
      setPage(page + 1);
      return;
    }
    if (!accepted) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await completeOnboarding();
    router.replace('/login');
  };

  if (onboardingDone && !accepted) return <Redirect href="/" />;

  const pages = SLIDES.map((slide, index) => (
    <Slide key={slide.title} art={slide.art} title={slide.title} body={slide.body}>
      {index === LAST ? <ConsentBlock accepted={accepted} onChange={setAccepted} /> : null}
    </Slide>
  ));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        {isLast ? null : (
          <PressableScale
            onPress={() => setPage(LAST)}
            accessibilityLabel="Pular apresentação"
            accessibilityHint="Vai para o aceite dos termos"
            style={styles.skip}>
            <Text style={styles.skipText}>Pular</Text>
          </PressableScale>
        )}
      </View>

      <OnboardingPager pages={pages} page={page} onPageChange={setPage} progress={progress} />

      <View style={styles.footer}>
        <PaginationDots count={SLIDES.length} progress={progress} current={page} />
        <Button
          label={isLast ? 'Começar' : 'Próximo'}
          onPress={next}
          disabled={isLast && !accepted}
          accessibilityHint={isLast && !accepted ? 'Aceite os termos para continuar' : undefined}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: { height: 48, flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: screenPadding - spacing.sm },
  skip: { minHeight: 44, minWidth: 64, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  skipText: { ...typography.bodyMedium, fontSize: 17, color: colors.primary },
  slide: { flex: 1, paddingHorizontal: screenPadding, justifyContent: 'center', paddingBottom: spacing.xl },
  art: { height: 300, justifyContent: 'center', marginBottom: spacing.lg },
  texts: { gap: spacing.md, paddingHorizontal: spacing.xs },
  title: { ...typography.title, color: colors.textHeading },
  body: { ...typography.bodyLarge, color: colors.textSecondary },
  consent: { marginTop: spacing.xl, gap: spacing.xs },
  links: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  linkText: { ...typography.bodyMedium, fontSize: 15, color: colors.primary, textDecorationLine: 'underline' },
  linkDot: { ...typography.body, color: colors.textMuted },
  footer: { paddingHorizontal: screenPadding, paddingTop: spacing.lg, paddingBottom: spacing.lg, gap: spacing.xl },
});
