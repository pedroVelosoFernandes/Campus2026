import { Mic } from 'lucide-react-native';
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { colors } from '@/theme';

import { PressableScale } from './PressableScale';

export type MicOrbProps = {
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Diâmetro do círculo central, em pontos. */
  size?: number;
};

const BREATH_MS = 2600;

type RingProps = { progress: SharedValue<number>; diameter: number; color: string; amplitude: number };

function Ring({ progress, diameter, color, amplitude }: RingProps) {
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.get() * amplitude }],
    opacity: 1 - progress.get() * 0.35,
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundImage: `radial-gradient(circle, ${color} 55%, ${colors.background} 100%)`,
        },
        style,
      ]}
    />
  );
}

/**
 * Orbe do microfone da tela inicial: círculo teal com anéis de brilho
 * concêntricos que "respiram" em loop. Fica estático com "Reduzir movimento".
 */
function MicOrbBase({ onPress, accessibilityLabel = 'Conversar por voz', size = 124 }: MicOrbProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      progress.set(0);
      return;
    }
    progress.set(
      withRepeat(withTiming(1, { duration: BREATH_MS, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    return () => cancelAnimation(progress);
  }, [progress, reduceMotion]);

  const outer = size * 1.8;
  const middle = size * 1.36;

  return (
    <View style={[styles.wrap, { width: outer, height: outer }]}>
      <Ring progress={progress} diameter={outer} color={colors.glowOuter} amplitude={0.06} />
      <Ring progress={progress} diameter={middle} color={colors.glowInner} amplitude={0.08} />
      <PressableScale
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        pressedScale={0.94}
        style={[styles.core, { width: size, height: size, borderRadius: size / 2 }]}>
        <Mic size={size * 0.36} color={colors.onPrimary} strokeWidth={1.75} />
      </PressableScale>
    </View>
  );
}

export const MicOrb = memo(MicOrbBase);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.primaryBright,
    // Sombreamento radial do orbe do design: centro menta claro, borda teal profunda.
    backgroundImage: `radial-gradient(circle at 50% 45%, ${colors.orbCenter} 0%, ${colors.primaryBright} 52%, ${colors.primary} 100%)`,
    borderWidth: 3,
    borderColor: colors.glowRim,
    boxShadow: '0px 10px 28px rgba(31, 156, 158, 0.28)',
  },
});
