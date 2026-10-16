import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme';

import type { VoiceActivity } from './status-copy';
import { VoiceWaveform } from './VoiceWaveform';

/** Velocidade (ciclos/s), energia e espalhamento da onda para cada estado. */
const MOTION: Record<VoiceActivity, { speed: number; energy: number; spread: number }> = {
  lively: { speed: 1.5, energy: 1, spread: 1 },
  pulse: { speed: 0.55, energy: 0.6, spread: 0 },
  calm: { speed: 0.25, energy: 0.12, spread: 1 },
};

const TRANSITION = { duration: 450, easing: Easing.out(Easing.quad) };

export type AssistantOrbProps = {
  activity: VoiceActivity;
  /** Diâmetro do núcleo do orbe, em pontos. */
  size?: number;
};

/**
 * Orbe teal brilhante do assistente, ladeado por barras de áudio. Um único
 * relógio (useFrameCallback) move barras e orbe; a velocidade muda suavemente
 * com o estado da conversa. Com "Reduzir movimento", tudo fica estático.
 */
function AssistantOrbBase({ activity, size = 124 }: AssistantOrbProps) {
  const reduceMotion = useReducedMotion();
  const clock = useSharedValue(0.25);
  const speed = useSharedValue(MOTION[activity].speed);
  const energy = useSharedValue(MOTION[activity].energy);
  const spread = useSharedValue(MOTION[activity].spread);

  const ticker = useFrameCallback((frame) => {
    const dt = (frame.timeSincePreviousFrame ?? 0) / 1000;
    clock.set(clock.get() + dt * speed.get());
  }, false);

  useEffect(() => {
    const target = MOTION[activity];
    speed.set(withTiming(target.speed, TRANSITION));
    energy.set(reduceMotion ? 0.5 : withTiming(target.energy, TRANSITION));
    spread.set(withTiming(target.spread, TRANSITION));
  }, [activity, energy, reduceMotion, speed, spread]);

  useEffect(() => {
    ticker.setActive(!reduceMotion);
    if (reduceMotion) clock.set(0.25);
    return () => ticker.setActive(false);
  }, [clock, reduceMotion, ticker]);

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.035 * energy.get() * Math.sin(clock.get() * Math.PI * 2) }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.05 * energy.get() * (0.5 + 0.5 * Math.sin(clock.get() * Math.PI)) }],
  }));

  const halo = size * 1.9;
  const motion = { clock, energy, spread };

  return (
    <View style={[styles.wrap, { height: halo }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.layer}>
        <Animated.View style={[styles.halo, { width: halo, height: halo, borderRadius: halo / 2 }, haloStyle]} />
      </View>
      <View style={styles.side}>
        <VoiceWaveform side="left" {...motion} />
      </View>
      <View style={{ width: size + 8 }} />
      <View style={styles.side}>
        <VoiceWaveform side="right" {...motion} />
      </View>
      <View style={styles.layer}>
        <Animated.View style={[styles.core, { width: size, height: size, borderRadius: size / 2 }, coreStyle]} />
      </View>
    </View>
  );
}

export const AssistantOrb = memo(AssistantOrbBase);

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  side: { flex: 1, alignItems: 'center' },
  layer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  halo: {
    backgroundImage: `radial-gradient(circle, ${colors.glowRim} 0%, ${colors.glowInner} 38%, ${colors.glowOuter} 58%, ${colors.background} 72%)`,
  },
  core: {
    backgroundColor: colors.primaryBright,
    // Esfera teal: brilho menta no centro, borda teal profunda.
    backgroundImage: `radial-gradient(circle at 50% 42%, ${colors.orbCenter} 0%, ${colors.primaryBright} 48%, ${colors.primary} 100%)`,
    boxShadow: '0px 0px 36px rgba(31, 156, 158, 0.45)',
  },
});
