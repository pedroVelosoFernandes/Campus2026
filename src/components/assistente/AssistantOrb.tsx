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

import { OrbGlow, OrbSphere } from './OrbArt';
import { VoiceWaveform } from './VoiceWaveform';

/** Ciclos por segundo do relógio enquanto o assistente fala. */
const SPEED = 1.35;
const FADE_IN = { duration: 380, easing: Easing.out(Easing.cubic) };
const FADE_OUT = { duration: 620, easing: Easing.inOut(Easing.cubic) };

export type AssistantOrbProps = {
  /** true somente enquanto o assistente fala: é o único momento em que orbe e barras se movem. */
  speaking: boolean;
  /** Diâmetro da esfera, em pontos. */
  size?: number;
};

/**
 * Orbe teal luminoso do assistente, ladeado por barras de áudio. Fica parado
 * enquanto a pessoa fala ou o app pensa; só "respira" com a voz do assistente.
 * Um único relógio (useFrameCallback) move barras e orbe e roda apenas durante
 * a fala; a energia entra e sai suavemente. Com "Reduzir movimento", nada oscila.
 */
function AssistantOrbBase({ speaking, size = 124 }: AssistantOrbProps) {
  const reduceMotion = useReducedMotion();
  const clock = useSharedValue(0);
  const energy = useSharedValue(0);
  const animate = speaking && !reduceMotion;

  const ticker = useFrameCallback((frame) => {
    const dt = (frame.timeSincePreviousFrame ?? 0) / 1000;
    clock.set(clock.get() + dt * SPEED);
  }, false);

  useEffect(() => {
    energy.set(withTiming(animate ? 1 : 0, animate ? FADE_IN : FADE_OUT));
    if (animate) ticker.setActive(true);
    // Ao parar, o relógio segue até a energia zerar, para a saída ser suave.
    const stop = setTimeout(() => ticker.setActive(animate), animate ? 0 : FADE_OUT.duration);
    return () => clearTimeout(stop);
  }, [animate, energy, ticker]);

  useEffect(() => () => ticker.setActive(false), [ticker]);

  const coreStyle = useAnimatedStyle(() => {
    const t = clock.get() * Math.PI * 2;
    const beat = 0.5 + 0.5 * Math.sin(t * 1.2) * (0.75 + 0.25 * Math.sin(t * 0.43));
    return { transform: [{ scale: 1 + 0.045 * energy.get() * beat }] };
  });
  const glowStyle = useAnimatedStyle(() => {
    const t = clock.get() * Math.PI * 2;
    const swell = 0.5 + 0.5 * Math.sin(t * 0.8 - 0.6);
    const e = energy.get();
    return { opacity: 0.86 + 0.14 * e * swell, transform: [{ scale: 1 + 0.07 * e * swell }] };
  });

  const height = Math.round(size * 1.9);
  const glow = Math.round(size * 2.7);
  const motion = { clock, energy };

  return (
    <View
      testID="assistant-orb"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      // Exposto aos testes: o orbe só anima enquanto o assistente fala.
      accessibilityValue={{ text: animate ? 'animando' : 'parado' }}
      style={[styles.wrap, { height }]}>
      <View pointerEvents="none" style={styles.layer}>
        <Animated.View style={[{ width: glow, height: glow }, glowStyle]}>
          <OrbGlow extent={glow} coreSize={size} />
        </Animated.View>
      </View>
      <View style={styles.side}>
        <VoiceWaveform side="left" {...motion} />
      </View>
      <View style={{ width: size + 14 }} />
      <View style={styles.side}>
        <VoiceWaveform side="right" {...motion} />
      </View>
      <View pointerEvents="none" style={styles.layer}>
        <Animated.View style={[{ width: size, height: size }, coreStyle]}>
          <OrbSphere size={size} />
        </Animated.View>
      </View>
    </View>
  );
}

export const AssistantOrb = memo(AssistantOrbBase);

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  side: { flex: 1, alignItems: 'center' },
  layer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
