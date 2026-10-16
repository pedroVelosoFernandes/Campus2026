import { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Avatar } from '@/components/Avatar';
import { colors, radii, spacing, typography } from '@/theme';

const ENTERING = FadeInDown.duration(260).reduceMotion(ReduceMotion.System);
const PULSE_MS = 900;

/** Menta mais forte e borda teal para a fala que está sendo captada agora. */
const LIVE_SURFACE = '#CDEAE6';
const LIVE_BORDER_SOFT = 'rgba(31, 156, 158, 0.18)';
const LIVE_BORDER_STRONG = 'rgba(31, 156, 158, 0.75)';

export type BubbleVariant = 'assistant' | 'user' | 'user-live';

function Dot({ pulse, index }: { pulse: SharedValue<number>; index: number }) {
  const style = useAnimatedStyle(() => {
    const phase = (pulse.get() * 2 + index * 0.33) % 1;
    return { opacity: 0.3 + 0.7 * Math.sin(phase * Math.PI) };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

/** Três pontos e borda pulsando: indicam que a fala ainda está sendo captada. */
function useLivePulse(active: boolean) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0.5);
  useEffect(() => {
    if (!active || reduceMotion) {
      cancelAnimation(pulse);
      pulse.set(0.5);
      return;
    }
    pulse.set(0);
    pulse.set(withRepeat(withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(pulse);
  }, [active, pulse, reduceMotion]);
  return pulse;
}

export type TranscriptBubbleProps = {
  variant: BubbleVariant;
  text: string;
};

/**
 * Balão da transcrição ao vivo: avatar à esquerda. Assistente em cinza-azulado,
 * pessoa em menta; a fala que está sendo captada ganha menta mais forte, borda
 * pulsando e pontinhos.
 */
function TranscriptBubbleBase({ variant, text }: TranscriptBubbleProps) {
  const isUser = variant !== 'assistant';
  const live = variant === 'user-live';
  const pulse = useLivePulse(live);
  const borderStyle = useAnimatedStyle(() => ({
    // Sempre explícito: um balão que deixa de ser "ao vivo" não pode herdar a borda animada.
    borderColor: live ? interpolateColor(pulse.get(), [0, 1], [LIVE_BORDER_SOFT, LIVE_BORDER_STRONG]) : 'transparent',
  }));

  return (
    <Animated.View
      entering={ENTERING}
      style={styles.row}
      accessible
      accessibilityLabel={`${isUser ? 'Você' : 'Assistente'}${live ? ' (falando agora)' : ''}: ${text}`}>
      <Avatar kind={isUser ? 'user' : 'assistant'} size={44} />
      <Animated.View testID={`bubble-${variant}`} style={[styles.bubble, BUBBLE[variant], borderStyle]}>
        <Text style={styles.text}>{text}</Text>
        {live ? (
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => (
              <Dot key={i} pulse={pulse} index={i} />
            ))}
          </View>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

export const TranscriptBubble = memo(TranscriptBubbleBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bubble: {
    flex: 1,
    paddingVertical: spacing.lg - 1.5,
    paddingHorizontal: spacing.lg - 1.5,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  text: { ...typography.bodyLarge, color: colors.textBody },
  dots: { flexDirection: 'row', gap: 5, marginTop: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primaryBright },
});

const BUBBLE = StyleSheet.create({
  assistant: { backgroundColor: colors.bubbleAssistant },
  user: { backgroundColor: colors.bubbleUser },
  'user-live': { backgroundColor: LIVE_SURFACE, borderColor: LIVE_BORDER_SOFT },
});
