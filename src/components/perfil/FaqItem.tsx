import { ChevronDown } from 'lucide-react-native';
import { memo, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useContrastColors } from '@/features/settings';
import { colors, spacing, typography } from '@/theme';

export type FaqItemProps = {
  question: string;
  answer: string;
  expanded: boolean;
  onToggle: () => void;
  /** Conteúdo extra abaixo da resposta (ex.: link para outra tela). */
  footer?: ReactNode;
  testID?: string;
};

const TIMING = { duration: 240, reduceMotion: ReduceMotion.System } as const;

/**
 * Pergunta frequente com resposta em sanfona: a altura é medida fora do fluxo
 * e animada pelo Reanimated (some sem animação com "Reduzir animações").
 */
function FaqItemBase({ question, answer, expanded, onToggle, footer, testID }: FaqItemProps) {
  const palette = useContrastColors();
  const [contentHeight, setContentHeight] = useState(0);
  const progress = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    progress.set(withTiming(expanded ? 1 : 0, TIMING));
  }, [expanded, progress]);

  const bodyStyle = useAnimatedStyle(() => ({ height: progress.get() * contentHeight, opacity: progress.get() }));
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${progress.get() * 180}deg` }] }));

  const onMeasure = (event: LayoutChangeEvent) => setContentHeight(event.nativeEvent.layout.height);

  return (
    <View>
      <PressableScale
        onPress={onToggle}
        pressedScale={0.985}
        testID={testID}
        accessibilityLabel={question}
        accessibilityState={{ expanded }}
        accessibilityHint={expanded ? 'Toque para recolher a resposta' : 'Toque para ver a resposta'}
        style={styles.header}>
        <AppText style={[typography.bodyMedium, styles.question, { color: palette.textHeading }]}>{question}</AppText>
        <Animated.View style={chevronStyle}>
          <ChevronDown size={20} color={palette.textMuted} strokeWidth={1.75} />
        </Animated.View>
      </PressableScale>
      <Animated.View
        style={[styles.clip, bodyStyle]}
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}>
        <View style={styles.measure} onLayout={onMeasure}>
          <AppText style={[typography.body, { color: palette.textBody }]}>{answer}</AppText>
          {footer}
        </View>
      </Animated.View>
    </View>
  );
}

export const FaqItem = memo(FaqItemBase);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  question: { flex: 1 },
  clip: { overflow: 'hidden' },
  measure: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
});
