import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { colors, spacing } from '@/theme';

type DotProps = { index: number; progress: SharedValue<number> };

const DOT = 8;
const ACTIVE = 24;

function Dot({ index, progress }: DotProps) {
  const style = useAnimatedStyle(() => {
    const distance = Math.min(1, Math.abs(progress.get() - index));
    return {
      width: interpolate(distance, [0, 1], [ACTIVE, DOT]),
      backgroundColor: interpolateColor(distance, [0, 1], [colors.primary, colors.borderStrong]),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

export type PaginationDotsProps = {
  count: number;
  /** Posição contínua do carrossel (0 … count-1), acompanha o dedo. */
  progress: SharedValue<number>;
  current: number;
};

/** Indicador de páginas: o ponto ativo vira uma pílula teal. */
function PaginationDotsBase({ count, progress, current }: PaginationDotsProps) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Página ${current + 1} de ${count}`}>
      {Array.from({ length: count }, (_, index) => (
        <Dot key={index} index={index} progress={progress} />
      ))}
    </View>
  );
}

export const PaginationDots = memo(PaginationDotsBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, height: 24 },
  dot: { height: DOT, borderRadius: DOT / 2 },
});
