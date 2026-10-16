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
      {withAvatar ? <Avatar kind={isUser ? 'user' : 'assistant'} size={44} /> : null}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

export const ChatBubble = memo(ChatBubbleBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowUser: { justifyContent: 'flex-end' },
  bubble: {
    paddingVertical: spacing.lg + 2,
    paddingHorizontal: spacing.lg + 2,
    borderRadius: radii.xl,
  },
  // Assistente ocupa a largura até a margem; usuário quebra a linha antes (~72%), como no design.
  bubbleAssistant: { flex: 1, backgroundColor: colors.bubbleAssistant },
  bubbleUser: { flexShrink: 1, maxWidth: '72%', backgroundColor: colors.bubbleUser },
  text: { ...typography.bodyLarge, color: colors.textBody },
});
