import { ChevronRight, MessageSquareText, Mic, Siren } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { IconTile } from '@/components/IconTile';
import { PressableScale } from '@/components/PressableScale';
import { formatConversationDate, type SavedConversation } from '@/features/history';
import { useContrastColors, useScaledTypography } from '@/features/settings';
import { colors, spacing } from '@/theme';

export type ConversationRowProps = {
  conversation: SavedConversation;
  onOpen: (id: string) => void;
  onLongPress?: (conversation: SavedConversation) => void;
  now?: Date;
};

/** Linha da lista de conversas: canal, título, data e o próximo passo sugerido. */
function ConversationRowBase({ conversation, onOpen, onLongPress, now }: ConversationRowProps) {
  const type = useScaledTypography();
  const palette = useContrastColors();
  const voice = conversation.channel === 'voz';
  const date = formatConversationDate(conversation.updatedAt, now);
  const meta = `${date} · ${voice ? 'Por voz' : 'Por texto'}`;
  const outcome = conversation.outcome;

  return (
    <PressableScale
      onPress={() => onOpen(conversation.id)}
      onLongPress={onLongPress ? () => onLongPress(conversation) : undefined}
      accessibilityLabel={`${conversation.title}. ${meta}${outcome ? `. Próximo passo: ${outcome.label}` : ''}`}
      accessibilityHint="Abre a conversa"
      pressedScale={0.985}
      style={styles.row}
      testID={`conversa-${conversation.id}`}>
      <IconTile icon={voice ? Mic : MessageSquareText} size={44} />
      <View style={styles.texts}>
        <AppText numberOfLines={2} style={[type.bodyMedium, { color: palette.textHeading }]}>
          {conversation.title}
        </AppText>
        <AppText style={[type.caption, { color: palette.textSecondary }]}>{meta}</AppText>
        {outcome ? (
          <View style={styles.outcome}>
            {outcome.emergency ? <Siren size={14} color={colors.dangerPressed} strokeWidth={2} /> : null}
            <AppText
              numberOfLines={1}
              style={[type.caption, styles.outcomeText, outcome.emergency && styles.outcomeDanger]}>
              {outcome.label}
            </AppText>
          </View>
        ) : null}
      </View>
      <ChevronRight size={20} color={palette.textMuted} strokeWidth={1.75} />
    </PressableScale>
  );
}

export const ConversationRow = memo(ConversationRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 76,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
  },
  texts: { flex: 1, gap: spacing.xxs },
  outcome: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxs },
  outcomeText: { flexShrink: 1, color: colors.primary, fontFamily: 'Figtree_500Medium' },
  outcomeDanger: { color: colors.dangerPressed },
});
