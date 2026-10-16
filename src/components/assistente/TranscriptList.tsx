import { memo, useCallback, useRef, type ComponentRef, type ReactNode } from 'react';
import { FlatList, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import Animated, { FadeInDown, ReduceMotion, useReducedMotion } from 'react-native-reanimated';

import { Avatar } from '@/components/Avatar';
import type { TranscriptMessage } from '@/features/voice';
import { colors, radii, screenPadding, spacing, typography } from '@/theme';

const ENTERING = FadeInDown.duration(260).reduceMotion(ReduceMotion.System);

type SpokenMessage = Extract<TranscriptMessage, { role: 'user' | 'assistant' }>;

function isSpoken(message: TranscriptMessage): message is SpokenMessage {
  return (message.role === 'user' || message.role === 'assistant') && message.text.trim().length > 0;
}

/** Balão da transcrição ao vivo: avatar à esquerda, balão cinza-azulado (como no design). */
const TranscriptBubble = memo(function TranscriptBubble({ role, text }: SpokenMessage) {
  const isUser = role === 'user';
  return (
    <Animated.View
      entering={ENTERING}
      style={styles.row}
      accessible
      accessibilityLabel={`${isUser ? 'Você' : 'Assistente'}: ${text}`}>
      <Avatar kind={isUser ? 'user' : 'assistant'} size={44} style={isUser ? styles.userAvatar : undefined} />
      <View style={styles.bubble}>
        <Text style={styles.text}>{text}</Text>
      </View>
    </Animated.View>
  );
});

const keyOf = (message: SpokenMessage) => message.id;
const renderBubble: ListRenderItem<SpokenMessage> = ({ item }) => <TranscriptBubble {...item} />;

export type TranscriptListProps = {
  transcript: TranscriptMessage[];
  /** Conteúdo exibido depois das mensagens (sugestão de próximo passo). */
  footer?: ReactNode;
};

/** Transcrição rolável da conversa; acompanha sempre a mensagem mais recente. */
function TranscriptListBase({ transcript, footer }: TranscriptListProps) {
  const scrollRef = useRef<ComponentRef<typeof FlatList<SpokenMessage>>>(null);
  const reduceMotion = useReducedMotion();
  const followLatest = useCallback(
    () => scrollRef.current?.scrollToEnd({ animated: !reduceMotion }),
    [reduceMotion],
  );
  const messages = transcript.filter(isSpoken);

  return (
    <FlatList
      ref={scrollRef}
      data={messages}
      keyExtractor={keyOf}
      renderItem={renderBubble}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
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
  );
}

export const TranscriptList = memo(TranscriptListBase);

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: screenPadding, paddingVertical: spacing.sm, gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  userAvatar: { backgroundColor: colors.avatarSurface },
  bubble: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.bubbleAssistant,
  },
  text: { ...typography.bodyLarge, color: colors.textBody },
  footer: { marginTop: spacing.xs },
});
