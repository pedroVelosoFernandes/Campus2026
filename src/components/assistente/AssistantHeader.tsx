import { RotateCcw } from 'lucide-react-native';
import { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { colors, fontFamily, screenPadding, spacing, typography } from '@/theme';

import { AssistantOrb } from './AssistantOrb';
import type { StatusCopy } from './status-copy';

const ORB_SIZE = 124;
/** Altura do orbe aberto (tela vazia) e recolhido (com conversa). */
const ORB_FULL = Math.round(ORB_SIZE * 1.9);
const ORB_COMPACT = 104;
const ORB_COMPACT_SCALE = 0.5;
const TITLE_LINE = 30;
const TITLE_COMPACT_SCALE = 0.75;
const SUBTITLE_LINE = 22;
const COLLAPSE = { duration: 520, easing: Easing.inOut(Easing.cubic) };

export type AssistantHeaderProps = {
  copy: StatusCopy;
  speaking: boolean;
  /** Recolhe o orbe e o status para a transcrição ganhar espaço. */
  compact: boolean;
  /** Em erro, mostra o botão "Tentar de novo". */
  onRetry?: () => void;
};

/**
 * Orbe + estado da conversa. Com a tela vazia, o orbe é grande e o subtítulo
 * aparece; quando a conversa começa, tudo encolhe suavemente para um cabeçalho
 * compacto (orbe menor e status em uma linha).
 */
function AssistantHeaderBase({ copy, speaking, compact, onRetry }: AssistantHeaderProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(compact ? 1 : 0);

  useEffect(() => {
    const target = compact ? 1 : 0;
    progress.set(reduceMotion ? target : withTiming(target, COLLAPSE));
  }, [compact, progress, reduceMotion]);

  const orbBox = useAnimatedStyle(() => ({
    height: interpolate(progress.get(), [0, 1], [ORB_FULL, ORB_COMPACT]),
  }));
  const orbScale = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.get(), [0, 1], [1, ORB_COMPACT_SCALE]) }],
  }));
  const titleStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.get(), [0, 1], [1, TITLE_COMPACT_SCALE]);
    return { height: TITLE_LINE * scale, transform: [{ scale }] };
  });
  const subtitleStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.get(), [0, 0.6], [SUBTITLE_LINE, 0], 'clamp'),
    opacity: interpolate(progress.get(), [0, 0.45], [1, 0], 'clamp'),
    marginTop: interpolate(progress.get(), [0, 0.6], [spacing.sm, 0], 'clamp'),
  }));
  const statusStyle = useAnimatedStyle(() => ({
    marginBottom: interpolate(progress.get(), [0, 1], [spacing.lg, spacing.xs]),
  }));

  return (
    <View>
      <Animated.View style={[styles.orbBox, orbBox]}>
        <Animated.View style={[styles.orb, orbScale]}>
          <AssistantOrb speaking={speaking} size={ORB_SIZE} />
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.status, statusStyle]} accessibilityLiveRegion="polite">
        <Animated.View style={[styles.titleBox, titleStyle]}>
          <View style={styles.titleLine}>
            <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
              {copy.title}
            </Text>
          </View>
        </Animated.View>
        <Animated.View style={[styles.subtitleBox, subtitleStyle]}>
          <Text style={styles.subtitle} numberOfLines={1}>
            {copy.subtitle}
          </Text>
        </Animated.View>
        {onRetry ? (
          <Button label="Tentar de novo" icon={RotateCcw} variant="secondary" onPress={onRetry} style={styles.retry} />
        ) : null}
      </Animated.View>
    </View>
  );
}

export const AssistantHeader = memo(AssistantHeaderBase);

const styles = StyleSheet.create({
  orbBox: { justifyContent: 'center' },
  orb: { height: ORB_FULL, paddingHorizontal: spacing.xl, justifyContent: 'center' },
  status: { alignItems: 'center', paddingHorizontal: screenPadding },
  titleBox: { justifyContent: 'center' },
  titleLine: { height: TITLE_LINE, justifyContent: 'center' },
  title: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: TITLE_LINE, color: colors.textHeading, textAlign: 'center' },
  subtitleBox: { overflow: 'hidden', justifyContent: 'center' },
  subtitle: { ...typography.body, fontSize: 15.5, lineHeight: SUBTITLE_LINE,
    height: SUBTITLE_LINE, color: colors.textSecondary, textAlign: 'center' },
  retry: { marginTop: spacing.md, alignSelf: 'stretch' },
});
