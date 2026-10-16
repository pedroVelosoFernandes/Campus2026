import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Avatar } from '@/components/Avatar';
import { colors, radii, spacing } from '@/theme';

const DOT = 7;
const STEP = 320;

function Dot({ progress }: { progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.get() * 0.65,
    transform: [{ translateY: -progress.get() * 3 }],
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

/** Balão do assistente com três pontos pulsando enquanto ele pensa. */
function TypingIndicatorBase() {
  const reduceMotion = useReducedMotion();
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  const c = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      [a, b, c].forEach((value) => value.set(0.6));
      return;
    }
    [a, b, c].forEach((value, index) => {
      value.set(
        withDelay(
          index * (STEP / 2),
          withRepeat(withSequence(withTiming(1, { duration: STEP }), withTiming(0, { duration: STEP })), -1),
        ),
      );
    });
  }, [a, b, c, reduceMotion]);

  return (
    <Animated.View
      entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="O assistente está escrevendo">
      <Avatar kind="assistant" size={36} />
      <View style={styles.bubble}>
        <Dot progress={a} />
        <Dot progress={b} />
        <Dot progress={c} />
      </View>
    </Animated.View>
  );
}

export const TypingIndicator = memo(TypingIndicatorBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 46,
    paddingHorizontal: spacing.lg + spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: colors.bubbleAssistant,
  },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: colors.textMuted },
});
