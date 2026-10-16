import { memo, useEffect, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const SNAP = { duration: 320, reduceMotion: ReduceMotion.System } as const;
const SWIPE_DISTANCE = 0.22;
const SWIPE_VELOCITY = 500;

export type OnboardingPage = { key: string; content: ReactNode };

export type OnboardingPagerProps = {
  pages: OnboardingPage[];
  page: number;
  onPageChange: (page: number) => void;
  /** Recebe a posição contínua (para os pontos de paginação). */
  progress: SharedValue<number>;
};

/**
 * Carrossel horizontal do onboarding: arraste com o Gesture Handler e
 * encaixe animado pelo Reanimated (instantâneo com "Reduzir movimento").
 */
function OnboardingPagerBase({ pages, page, onPageChange, progress }: OnboardingPagerProps) {
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(-page * width);
  const last = pages.length - 1;

  useEffect(() => {
    translateX.set(withTiming(-page * width, SNAP));
  }, [page, width, translateX]);

  useDerivedValue(() => {
    progress.set(width > 0 ? -translateX.get() / width : 0);
  });

  const pan = usePanGesture({
    activeOffsetX: [-12, 12],
    failOffsetY: [-16, 16],
    onUpdate: (event) => {
      const raw = -page * width + event.translationX;
      // Resistência nas pontas.
      const min = -last * width;
      const clamped = raw > 0 ? raw * 0.3 : raw < min ? min + (raw - min) * 0.3 : raw;
      translateX.set(clamped);
    },
    onDeactivate: (event) => {
      const passed = Math.abs(event.translationX) > width * SWIPE_DISTANCE || Math.abs(event.velocityX) > SWIPE_VELOCITY;
      const direction = event.translationX < 0 ? 1 : -1;
      const target = passed ? Math.min(last, Math.max(0, page + direction)) : page;
      translateX.set(withTiming(-target * width, SNAP));
      if (target !== page) scheduleOnRN(onPageChange, target);
    },
  });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.get() }] }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.viewport}>
        <Animated.View style={[styles.row, { width: width * pages.length }, rowStyle]}>
          {pages.map(({ key, content }, index) => (
            <View
              key={key}
              style={{ width }}
              importantForAccessibility={index === page ? 'auto' : 'no-hide-descendants'}
              accessibilityElementsHidden={index !== page}>
              {content}
            </View>
          ))}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

export const OnboardingPager = memo(OnboardingPagerBase);

const styles = StyleSheet.create({
  viewport: { flex: 1, overflow: 'hidden' },
  row: { flex: 1, flexDirection: 'row' },
});
