import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { colors } from '@/theme';

/** Alturas relativas das barras, da borda da tela para o orbe (amostradas do design). */
const PROFILE = [0.22, 0.38, 0.3, 0.55, 0.42, 0.78, 0.6, 1, 0.82, 0.64, 0.9, 0.5, 0.34];
const BARS = PROFILE.map((weight, position) => ({ id: `bar-${position}`, weight, position }));

const BAR_WIDTH = 3.5;
const BAR_GAP = 3.5;
const TAU = Math.PI * 2;

export type WaveformMotion = {
  /** Relógio em ciclos (avança mais rápido quando a conversa está animada). */
  clock: SharedValue<number>;
  /** 0 = barras quase paradas, 1 = barras vivas. */
  energy: SharedValue<number>;
  /** 0 = todas as barras pulsam juntas, 1 = onda que percorre as barras. */
  spread: SharedValue<number>;
};

type BarProps = WaveformMotion & { index: number; height: number; opacity: number };

function Bar({ index, height, opacity, clock, energy, spread }: BarProps) {
  const style = useAnimatedStyle(() => {
    const t = clock.get() * TAU;
    const phase = index * 0.9 * spread.get();
    const jitter = 0.78 + 0.22 * Math.sin(t * 2.3 + index * 1.7 * spread.get());
    const wave = (0.5 + 0.5 * Math.sin(t + phase)) * jitter;
    const e = energy.get();
    return { transform: [{ scaleY: 0.3 + e * 0.7 * wave + (1 - e) * 0.28 }] };
  });
  return <Animated.View style={[styles.bar, { height, opacity }, style]} />;
}

export type VoiceWaveformProps = WaveformMotion & {
  /** left: barras à esquerda do orbe; right: espelhadas à direita. */
  side: 'left' | 'right';
  maxHeight?: number;
};

/** Barras de áudio ao lado do orbe; a altura de cada uma oscila na thread de UI. */
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
