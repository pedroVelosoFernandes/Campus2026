import { router } from 'expo-router';
import { RotateCcw } from 'lucide-react-native';
import { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssistantOrb } from '@/components/assistente/AssistantOrb';
import { CallControls } from '@/components/assistente/CallControls';
import { statusCopy } from '@/components/assistente/status-copy';
import { SuggestionCard } from '@/components/assistente/SuggestionCard';
import { TranscriptList } from '@/components/assistente/TranscriptList';
import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useVoiceAssistant } from '@/features/voice';
import { colors, fontFamily, screenPadding, spacing, typography } from '@/theme';

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function AssistenteScreen() {
  // Insets do provider raiz: o SafeAreaView nativo não os recebe dentro do fullScreenModal.
  const insets = useSafeAreaInsets();
  const { state, transcript, muted, error, suggestedAction, start, stop, mute } = useVoiceAssistant();

  // A conversa começa ao abrir a tela e termina ao sair dela.
  useEffect(() => {
    void start();
    return () => stop();
  }, [start, stop]);

  const end = useCallback(() => {
    stop();
    leave();
  }, [stop]);

  const openKeyboard = useCallback(() => {
    stop();
    router.navigate('/conversas');
  }, [stop]);

  const toggleMic = useCallback(() => {
    if (state === 'idle' || state === 'error') void start();
    else mute();
  }, [mute, start, state]);

  const failed = state === 'error' || (!!error && state === 'idle');
  const copy = statusCopy(failed ? 'error' : state, muted);

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScreenHeader title="Assistente" onBack={end} backLabel="Voltar e encerrar conversa" />

      <View style={styles.orb}>
        <AssistantOrb activity={copy.activity} />
      </View>

      <View style={styles.status} accessibilityLiveRegion="polite">
        <Text style={styles.title} accessibilityRole="header">
          {copy.title}
        </Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
        {failed ? (
          <Button
            label="Tentar de novo"
            icon={RotateCcw}
            variant="secondary"
            onPress={() => void start()}
            style={styles.retry}
          />
        ) : null}
      </View>

      <TranscriptList
        transcript={transcript}
        footer={suggestedAction ? <SuggestionCard action={suggestedAction} onNavigate={stop} /> : null}
      />

      <View style={styles.controls}>
        <CallControls muted={muted} onKeyboard={openKeyboard} onToggleMute={toggleMic} onEnd={end} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  orb: { marginTop: spacing.sm, paddingHorizontal: spacing.xl },
  status: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: screenPadding, marginBottom: spacing.xl },
  title: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 30, color: colors.textHeading, textAlign: 'center' },
  subtitle: { ...typography.body, fontSize: 15.5, color: colors.textSecondary, textAlign: 'center' },
  retry: { marginTop: spacing.sm, alignSelf: 'stretch' },
  controls: { paddingTop: spacing.lg, paddingBottom: spacing.sm, paddingHorizontal: spacing.lg },
});
