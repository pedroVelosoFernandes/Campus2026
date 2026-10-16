import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { colors } from '@/theme';

/** Alturas relativas das barras, da borda da tela para o orbe (amostradas do design). */
const PROFILE = [0.22, 0.38, 0.3, 0.55, 0.42, 0.78, 0.6, 1, 0.82, 0.64, 0.9, 0.5, 0.34];
const BARS = PROFILE.map((weight, position) => ({ id: `bar-${position}`, weight, position }));

const BAR_WIDTH = 3;
const BAR_GAP = 4;
const TAU = Math.PI * 2;

export type WaveformMotion = {
  /** Relógio em ciclos; só avança enquanto o assistente fala. */
  clock: SharedValue<number>;
  /** 0 = barras em repouso (baixas e paradas), 1 = barras acompanhando a voz. */
  energy: SharedValue<number>;
};

type BarProps = WaveformMotion & { index: number; height: number; opacity: number };

/** Altura de repouso (fração da altura de cada barra) quando ninguém fala pelo assistente. */
const REST = 0.36;

function Bar({ index, height, opacity, clock, energy }: BarProps) {
  const style = useAnimatedStyle(() => {
    const t = clock.get() * TAU;
    // Onda que percorre as barras + variação rápida e envelope lento, como uma voz.
    const wave = 0.5 + 0.5 * Math.sin(t + index * 0.85);
    const jitter = 0.7 + 0.3 * Math.sin(t * 2.7 + index * 1.9);
    const envelope = 0.75 + 0.25 * Math.sin(t * 0.37 + 1.1);
    const active = 0.22 + 0.78 * wave * jitter * envelope;
    const e = energy.get();
    return { transform: [{ scaleY: REST + (active - REST) * e }] };
  });
  return <Animated.View style={[styles.bar, { height, opacity }, style]} />;
}

export type VoiceWaveformProps = WaveformMotion & {
  /** left: barras à esquerda do orbe; right: espelhadas à direita. */
  side: 'left' | 'right';
  maxHeight?: number;
};

/** Barras de áudio ao lado do orbe; oscilam na thread de UI só com a voz do assistente. */
function VoiceWaveformBase({ side, maxHeight = 64, ...motion }: VoiceWaveformProps) {
  const last = PROFILE.length - 1;
  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.row, side === 'right' && styles.mirror, { height: maxHeight }]}>
      {BARS.map(({ id, weight, position }) => (
        <Bar
          key={id}
          index={side === 'left' ? position : last - position}
          height={Math.round(maxHeight * weight)}
          opacity={0.32 + 0.5 * (position / last)}
          {...motion}
        />
      ))}
    </View>
  );
}

export const VoiceWaveform = memo(VoiceWaveformBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: BAR_GAP },
  mirror: { flexDirection: 'row-reverse' },
  bar: { width: BAR_WIDTH, borderRadius: BAR_WIDTH / 2, backgroundColor: colors.primaryBright },
});
