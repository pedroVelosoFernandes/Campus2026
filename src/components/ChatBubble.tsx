import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';

import { Avatar } from './Avatar';

export type ChatBubbleProps = {
  /** assistant: balão cinza-azulado à esquerda com avatar; user: balão menta à direita. */
  role: 'assistant' | 'user';
  text: string;
  /** Mostra o avatar ao lado do balão (padrão: só para o assistente). */
  showAvatar?: boolean;
};

function ChatBubbleBase({ role, text, showAvatar }: ChatBubbleProps) {
  const isUser = role === 'user';
  const withAvatar = showAvatar ?? !isUser;
  return (
    <View
      style={[styles.row, isUser && styles.rowUser]}
      accessible
      accessibilityLabel={`${isUser ? 'Você' : 'Assistente'}: ${text}`}>
      {withAvatar ? <Avatar kind={isUser ? 'user' : 'assistant'} size={36} /> : null}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

export const ChatBubble = memo(ChatBubbleBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  rowUser: { justifyContent: 'flex-end' },
  bubble: {
    flexShrink: 1,
    maxWidth: '82%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
  },
  bubbleAssistant: { backgroundColor: colors.bubbleAssistant },
  bubbleUser: { backgroundColor: colors.bubbleUser },
  text: { ...typography.body, color: colors.textBody },
});
