import { router, useLocalSearchParams } from 'expo-router';
import { Lock, MessageSquareText, Trash2 } from 'lucide-react-native';
import { useMemo } from 'react';
import { Alert, FlatList, Linking, StyleSheet, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ChatBubble } from '@/components/ChatBubble';
import { routeForAction } from '@/components/conversas/chat-model';
import { SuggestedActionCard } from '@/components/conversas/SuggestedActionCard';
import { PressableScale } from '@/components/PressableScale';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  deleteConversation,
  formatConversationDate,
  useConversation,
  type SavedConversation,
} from '@/features/history';
import { colors, radii, screenPadding, spacing, typography } from '@/theme';

const goBack = () => (router.canGoBack() ? router.back() : router.navigate('/conversas'));
const callSamu = () => void Linking.openURL('tel:192').catch(() => {});
const openEmergencyContacts = () => router.push('/emergencia');

function confirmDelete(conversation: SavedConversation) {
  Alert.alert('Apagar esta conversa?', 'Ela será removida deste aparelho. Não dá para desfazer.', [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Apagar',
      style: 'destructive',
      onPress: () => {
        deleteConversation(conversation.id);
        goBack();
      },
    },
  ]);
}

type TranscriptItem = { id: string; role: 'user' | 'assistant'; text: string };

const renderMessage: ListRenderItem<TranscriptItem> = ({ item }) => <ChatBubble role={item.role} text={item.text} />;

function Transcript({ conversation }: { conversation: SavedConversation }) {
  const outcome = conversation.outcome;
  const route = outcome ? routeForAction(outcome) : null;
  const meta = `${formatConversationDate(conversation.startedAt)} · ${conversation.channel === 'voz' ? 'Por voz' : 'Por texto'}`;
  const items = useMemo<TranscriptItem[]>(
    () => conversation.messages.map((message, index) => ({ ...message, id: `${conversation.id}_${index}` })),
    [conversation],
  );
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={renderMessage}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={styles.meta}>
          <AppText style={styles.title} numberOfLines={3}>
            {conversation.title}
          </AppText>
          <View style={styles.metaRow}>
            <Lock size={13} color={colors.textSecondary} strokeWidth={2} />
            <AppText style={styles.metaText}>{meta} · Somente leitura</AppText>
          </View>
        </View>
      }
      ListFooterComponent={
        outcome ? (
          <SuggestedActionCard
            action={outcome}
            onOpen={route ? () => router.push(route) : undefined}
            onCallEmergency={callSamu}
            onOpenEmergencyContacts={openEmergencyContacts}
          />
        ) : undefined
      }
    />
  );
}

/** Conversa salva no histórico, somente leitura, com "Continuar conversa". Rota: /conversas/<id>. */
export default function ConversaSalvaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ready, conversation } = useConversation(id);

  if (!ready) return <View style={styles.safe} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Conversa salva" titleAlign="left" onBack={goBack} />
      {conversation ? (
        <>
          <Transcript conversation={conversation} />
          <View style={styles.actions}>
            <Button
              label="Continuar conversa"
              icon={MessageSquareText}
              onPress={() => router.replace({ pathname: '/conversas/chat', params: { continuar: conversation.id } })}
              style={styles.flex}
            />
            <PressableScale
              onPress={() => confirmDelete(conversation)}
              accessibilityLabel="Apagar conversa"
              pressedScale={0.94}
              style={styles.delete}>
              <Trash2 size={22} color={colors.dangerPressed} strokeWidth={1.8} />
            </PressableScale>
          </View>
        </>
      ) : (
        <View style={styles.missing}>
          <AppText style={styles.title}>Conversa não encontrada</AppText>
          <AppText style={styles.metaText}>Ela pode ter sido apagada deste aparelho.</AppText>
          <Button label="Ver conversas" variant="outline" onPress={() => router.navigate('/conversas')} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  list: { gap: spacing.lg, paddingHorizontal: screenPadding, paddingTop: spacing.md, paddingBottom: spacing.xl },
  meta: { gap: spacing.xs, paddingHorizontal: spacing.xs, paddingBottom: spacing.xs },
  title: { ...typography.headline, fontSize: 20, lineHeight: 26, color: colors.textHeading },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { ...typography.caption, color: colors.textSecondary },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  delete: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  missing: { gap: spacing.md, padding: screenPadding, alignItems: 'flex-start' },
});
