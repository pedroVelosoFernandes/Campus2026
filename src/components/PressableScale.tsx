import { memo, useCallback, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, type PressableProps } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  /** Estilo do contêiner animado (layout, fundo, borda). */
  style?: StyleProp<ViewStyle>;
  /** Estilo do Pressable externo (ex.: flex: 1 dentro de uma linha). */
  containerStyle?: StyleProp<ViewStyle>;
  /** Escala aplicada enquanto o dedo está pressionado. */
  pressedScale?: number;
};

const PRESS_IN = { duration: 90, reduceMotion: ReduceMotion.System } as const;
const RELEASE = { damping: 18, stiffness: 320, mass: 0.6, reduceMotion: ReduceMotion.System } as const;

/**
 * Botão base do app: Pressable do Gesture Handler (toque nativo) com uma
 * leve redução de escala animada pelo Reanimated na thread de UI.
 */
function PressableScaleBase({
  children,
  style,
  containerStyle,
  pressedScale = 0.97,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (event) => {
      scale.set(withTiming(pressedScale, PRESS_IN));
      onPressIn?.(event);
    },
    [onPressIn, pressedScale, scale],
  );

  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (event) => {
      scale.set(withSpring(1, RELEASE));
      onPressOut?.(event);
    },
    [onPressOut, scale],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={containerStyle}
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...rest}>
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

export const PressableScale = memo(PressableScaleBase);
