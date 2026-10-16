import { router } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssistantHeader } from '@/components/assistente/AssistantHeader';
import { CallControls } from '@/components/assistente/CallControls';
import { isAssistantSpeaking, statusCopy } from '@/components/assistente/status-copy';
import { SuggestionCard } from '@/components/assistente/SuggestionCard';
import { TranscriptList } from '@/components/assistente/TranscriptList';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useVoiceAssistant } from '@/features/voice';
import { colors, spacing } from '@/theme';

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
  const retry = useCallback(() => void start(), [start]);
  // Com conversa na tela, orbe e status recolhem e a transcrição ganha o espaço.
  const hasMessages =
    !!suggestedAction ||
    transcript.some((m) => (m.role === 'user' || m.role === 'assistant') && m.text.trim().length > 0);

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScreenHeader title="Assistente" onBack={end} backLabel="Voltar e encerrar conversa" />

      <AssistantHeader
        copy={copy}
        speaking={isAssistantSpeaking(state)}
        compact={hasMessages}
        onRetry={failed ? retry : undefined}
      />

      <TranscriptList
        transcript={transcript}
        userSpeaking={state === 'user_speaking'}
        footer={suggestedAction ? <SuggestionCard action={suggestedAction} onNavigate={stop} /> : null}
      />

      <View style={[styles.controls, { paddingBottom: insets.bottom + spacing.sm }]}>
        <CallControls muted={muted} onKeyboard={openKeyboard} onToggleMute={toggleMic} onEnd={end} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  controls: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    // Base levemente menta: separa os controles da conversa sem linha dura.
    backgroundImage: `linear-gradient(to bottom, ${colors.background} 0%, #F6FAFA 55%, #F1F7F7 100%)`,
  },
});
