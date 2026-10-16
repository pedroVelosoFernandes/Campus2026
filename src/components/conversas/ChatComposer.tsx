import { Info, Mic, SendHorizontal } from 'lucide-react-native';
import { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { PressableScale } from '@/components/PressableScale';
import { colors, fontFamily, radii, spacing, typography } from '@/theme';

export type ChatComposerProps = {
  onSend: (text: string) => void;
  onMicPress: () => void;
  disabled?: boolean;
};

const MORPH = { duration: 180, reduceMotion: ReduceMotion.System } as const;
const BUTTON = 46;

/** Botão redondo teal: microfone com o campo vazio, "enviar" quando há texto. */
function ActionButton({ hasText, onPress }: { hasText: boolean; onPress: () => void }) {
  const progress = useSharedValue(hasText ? 1 : 0);

  useEffect(() => {
    progress.set(withTiming(hasText ? 1 : 0, MORPH));
  }, [hasText, progress]);

  const micStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.get(),
    transform: [{ scale: interpolate(progress.get(), [0, 1], [1, 0.4]) }, { rotate: `${progress.get() * -45}deg` }],
  }));
  const sendStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ scale: interpolate(progress.get(), [0, 1], [0.4, 1]) }, { rotate: `${(1 - progress.get()) * 45}deg` }],
  }));

  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.9}
      hitSlop={4}
      accessibilityLabel={hasText ? 'Enviar mensagem' : 'Falar com o assistente por voz'}
      style={styles.button}>
      <Animated.View style={[styles.icon, micStyle]}>
        <Mic size={22} color={colors.onPrimary} strokeWidth={2} />
      </Animated.View>
      <Animated.View style={[styles.icon, sendStyle]}>
        <SendHorizontal size={21} color={colors.onPrimary} strokeWidth={2} />
      </Animated.View>
    </PressableScale>
  );
}

/** Campo "Escreva ou envie um áudio" + aviso de que a orientação não substitui o médico. */
function ChatComposerBase({ onSend, onMicPress, disabled }: ChatComposerProps) {
  const [text, setText] = useState('');
  const hasText = text.trim().length > 0;

  const submit = () => {
    if (!hasText || disabled) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Escreva ou envie um áudio"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Mensagem"
          style={styles.input}
          multiline
          maxLength={1000}
          submitBehavior="submit"
          returnKeyType="send"
          onSubmitEditing={submit}
        />
        <ActionButton hasText={hasText} onPress={hasText ? submit : onMicPress} />
      </View>
      <View style={styles.disclaimer} accessible accessibilityRole="text">
        <Info size={16} color={colors.textMuted} strokeWidth={1.75} />
        <Text style={styles.disclaimerText}>Orientação não substitui avaliação médica.</Text>
      </View>
    </View>
  );
}

export const ChatComposer = memo(ChatComposerBase);

const styles = StyleSheet.create({
  container: { gap: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 62,
    paddingLeft: spacing.lg + spacing.xs,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg + 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: BUTTON,
    paddingTop: 12,
    paddingBottom: 12,
    paddingRight: spacing.sm,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: colors.textBody,
  },
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  icon: { position: 'absolute' },
  disclaimer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  disclaimerText: { ...typography.caption, fontSize: 13.5, color: colors.textSecondary },
});
