import { memo, useCallback, useRef, type ComponentRef, type ReactNode } from 'react';
import { FlatList, StyleSheet, View, type LayoutChangeEvent, type ListRenderItem } from 'react-native';
import Animated, { FadeInDown, ReduceMotion, useReducedMotion } from 'react-native-reanimated';

import type { TranscriptMessage } from '@/features/voice';
import { screenPadding, spacing } from '@/theme';

import { isSpoken, bubbleVariant } from './transcript-rows';
import { TranscriptBubble, type BubbleVariant } from './TranscriptBubble';

const ENTERING = FadeInDown.duration(260).reduceMotion(ReduceMotion.System);
/** Altura das máscaras de esmaecimento no topo (sob o orbe) e na base (sobre os controles). */
const FADE_TOP = 36;
const FADE_BOTTOM = 32;

/** Degradê com várias paradas (curva suave) do fundo da tela até transparente. */
const fade = (direction: 'to bottom' | 'to top') =>
  `linear-gradient(${direction}, rgba(252,253,253,1) 0%, rgba(252,253,253,0.92) 22%, rgba(252,253,253,0.72) 45%, rgba(252,253,253,0.42) 68%, rgba(252,253,253,0.14) 88%, rgba(252,253,253,0) 100%)`;

type Row = { id: string; text: string; variant: BubbleVariant };

const keyOf = (row: Row) => row.id;
const renderBubble: ListRenderItem<Row> = ({ item }) => <TranscriptBubble variant={item.variant} text={item.text} />;

export type TranscriptListProps = {
  transcript: TranscriptMessage[];
  /** true enquanto a pessoa está falando (destaca o balão em captura). */
  userSpeaking?: boolean;
  /** Conteúdo exibido depois das mensagens (sugestão de próximo passo). */
  footer?: ReactNode;
};

/**
 * Transcrição rolável da conversa; acompanha sempre a mensagem mais recente e
 * permite rolar para cima. Máscaras suaves no topo e na base evitam cortes secos.
 */
function TranscriptListBase({ transcript, userSpeaking = false, footer }: TranscriptListProps) {
  const scrollRef = useRef<ComponentRef<typeof FlatList<Row>>>(null);
  const viewport = useRef(0);
  const reduceMotion = useReducedMotion();
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    viewport.current = event.nativeEvent.layout.height;
  }, []);
  // Rola até o fim real do conteúdo (inclui rodapé e respiro), o que o scrollToEnd da FlatList não garante.
  const followLatest = useCallback(
    (_width: number, height: number) =>
      scrollRef.current?.scrollToOffset({ offset: Math.max(0, height - viewport.current), animated: !reduceMotion }),
    [reduceMotion],
  );
  const rows: Row[] = transcript
    .filter(isSpoken)
    .map((m) => ({ id: m.id, text: m.text, variant: bubbleVariant(m, userSpeaking) }));

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={scrollRef}
        data={rows}
        keyExtractor={keyOf}
        renderItem={renderBubble}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onLayout={onLayout}
        onContentSizeChange={followLatest}
        accessibilityLabel="Transcrição da conversa"
        ListFooterComponent={
          footer ? (
            <Animated.View entering={ENTERING} style={styles.footer}>
              {footer}
            </Animated.View>
          ) : undefined
        }
      />
      <View pointerEvents="none" style={styles.fadeTop} />
      <View pointerEvents="none" style={styles.fadeBottom} />
    </View>
  );
}

export const TranscriptList = memo(TranscriptListBase);

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: screenPadding,
    paddingTop: FADE_TOP - spacing.sm,
    paddingBottom: FADE_BOTTOM,
    gap: spacing.lg,
  },
  footer: { marginTop: spacing.xs },
  fadeTop: { position: 'absolute', top: 0, left: 0, right: 0, height: FADE_TOP, backgroundImage: fade('to bottom') },
  fadeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: FADE_BOTTOM, backgroundImage: fade('to top') },
});
