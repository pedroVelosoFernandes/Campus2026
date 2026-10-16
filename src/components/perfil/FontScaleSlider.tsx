import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, type AccessibilityActionEvent, type LayoutChangeEvent } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { PressableScale } from '@/components/PressableScale';
import { FONT_SCALE_LABELS, FONT_SCALE_STEPS, stepFontScale, type FontScale } from '@/features/settings';
import { colors, fontFamily, radii, spacing } from '@/theme';

export type FontScaleSliderProps = {
  value: FontScale;
  onChange: (next: FontScale) => void;
};

const THUMB = 28;
const STOP_HIT = 44;
const SPRING = { damping: 20, stiffness: 260, mass: 0.7, reduceMotion: ReduceMotion.System } as const;
const LAST = FONT_SCALE_STEPS.length - 1;

function tick() {
  Haptics.selectionAsync().catch(() => {});
}

/**
 * Controle "A- ─●─ A+" com cinco degraus. Tocar nos botões ou em qualquer
 * ponto da trilha muda o tamanho; no VoiceOver é um ajuste deslizante
 * (deslize para cima/baixo).
 */
function Track({ index, onSelect }: { index: number; onSelect: (step: FontScale) => void }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const position = useSharedValue(index / LAST);

  useEffect(() => {
    position.set(withSpring(index / LAST, SPRING));
  }, [index, position]);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: position.get() * trackWidth }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: position.get() * trackWidth }));
  const onLayout = (event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width);

  return (
    <>
      <View style={styles.track} onLayout={onLayout}>
        <Animated.View style={[styles.fill, fillStyle]} />
        {FONT_SCALE_STEPS.map((step, stepIndex) => (
          <View
            key={step}
            style={[styles.dot, { left: (stepIndex / LAST) * trackWidth - 3 }, stepIndex <= index && styles.dotOn]}
          />
        ))}
        <Animated.View style={[styles.thumb, thumbStyle]} pointerEvents="none" />
      </View>
      <View style={styles.stops}>
        {FONT_SCALE_STEPS.map((step) => (
          <PressableScale
            key={step}
            onPress={() => onSelect(step)}
            pressedScale={1}
            accessibilityLabel={FONT_SCALE_LABELS[step]}
            containerStyle={styles.stop}
            testID={`font-scale-${step}`}>
            <View />
          </PressableScale>
        ))}
      </View>
    </>
  );
}

function FontScaleSliderBase({ value, onChange }: FontScaleSliderProps) {
  const index = Math.max(0, FONT_SCALE_STEPS.indexOf(value));

  const change = useCallback(
    (next: FontScale) => {
      if (next === value) return;
      tick();
      onChange(next);
    },
    [onChange, value],
  );

  const onAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'increment') change(stepFontScale(value, 1));
      if (event.nativeEvent.actionName === 'decrement') change(stepFontScale(value, -1));
    },
    [change, value],
  );

  return (
    <View style={styles.row}>
      <PressableScale
        onPress={() => change(stepFontScale(value, -1))}
        disabled={index === 0}
        accessibilityLabel="Diminuir texto"
        style={styles.side}>
        <Text style={[styles.letter, styles.small, index === 0 && styles.muted]}>A</Text>
      </PressableScale>

      <View
        style={styles.trackArea}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Tamanho do texto"
        accessibilityValue={{ text: FONT_SCALE_LABELS[value] }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAction}
        testID="font-scale-slider">
        <Track index={index} onSelect={change} />
      </View>

      <PressableScale
        onPress={() => change(stepFontScale(value, 1))}
        disabled={index === LAST}
        accessibilityLabel="Aumentar texto"
        style={styles.side}>
        <Text style={[styles.letter, styles.large, index === LAST && styles.muted]}>A</Text>
      </PressableScale>
    </View>
  );
}

export const FontScaleSlider = memo(FontScaleSliderBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  side: { width: STOP_HIT, height: STOP_HIT, alignItems: 'center', justifyContent: 'center' },
  letter: { fontFamily: fontFamily.semibold, color: colors.primary },
  small: { fontSize: 15, lineHeight: 20 },
  large: { fontSize: 26, lineHeight: 32 },
  muted: { color: colors.textMuted },
  trackArea: { flex: 1, height: STOP_HIT, justifyContent: 'center', marginHorizontal: THUMB / 2 },
  track: { height: 6, borderRadius: radii.pill, backgroundColor: colors.mintStrong, justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, height: 6, borderRadius: radii.pill, backgroundColor: colors.primary },
  dot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderStrong },
  dotOn: { backgroundColor: colors.primary },
  thumb: {
    position: 'absolute',
    left: -THUMB / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    boxShadow: '0px 2px 6px rgba(11, 27, 46, 0.16)',
  },
  stops: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -STOP_HIT / 2,
  },
  stop: { width: STOP_HIT, height: STOP_HIT },
});
