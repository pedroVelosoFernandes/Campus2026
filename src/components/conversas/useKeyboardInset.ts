import { useEffect, useRef, type ComponentRef } from 'react';
import { Keyboard, Platform, View, type KeyboardEvent } from 'react-native';
import { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Quanto do teclado cobre o contêiner: a distância entre a base do contêiner
 * (em coordenadas da janela) e o topo do teclado. Fora da tela de abas o valor
 * é a altura do teclado; dentro dela desconta a barra de abas que ele cobre.
 */
export function keyboardOverlap(containerBottom: number, keyboardTop: number): number {
  return Math.max(0, Math.round(containerBottom - keyboardTop));
}

const SHOW_EVENT = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
const HIDE_EVENT = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

/**
 * Mantém o rodapé (campo de mensagem) logo acima do teclado. Mede o contêiner na
 * janela a cada evento, então funciona dentro das abas — onde o
 * KeyboardAvoidingView usa o layout relativo ao pai e erra o deslocamento.
 */
export function useKeyboardInset() {
  const containerRef = useRef<ComponentRef<typeof View>>(null);
  const inset = useSharedValue(0);

  useEffect(() => {
    const animateTo = (value: number, duration: number) => {
      inset.set(
        withTiming(value, {
          duration: duration > 0 ? duration : 250,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        }),
      );
    };
    const onShow = (event: KeyboardEvent) => {
      const { screenY } = event.endCoordinates;
      containerRef.current?.measureInWindow((_x, y, _width, height) => {
        animateTo(keyboardOverlap(y + height, screenY), event.duration);
      });
    };
    const onHide = (event: KeyboardEvent) => animateTo(0, event.duration);

    const subscriptions = [Keyboard.addListener(SHOW_EVENT, onShow), Keyboard.addListener(HIDE_EVENT, onHide)];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [inset]);

  const insetStyle = useAnimatedStyle(() => ({ paddingBottom: inset.get() }));
  return { containerRef, insetStyle };
}
