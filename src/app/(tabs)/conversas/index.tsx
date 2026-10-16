import { router, useLocalSearchParams } from 'expo-router';
import { MessageSquarePlus, Trash2 } from 'lucide-react-native';
import { Fragment, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ConversationRow } from '@/components/conversas/ConversationRow';
import { HistoryEmptyState } from '@/components/conversas/HistoryEmptyState';
import { InfoNote } from '@/components/InfoNote';
import { PressableScale } from '@/components/PressableScale';
import {
  clearConversations,
  deleteConversation,
  useConversations,
  type SavedConversation,
} from '@/features/history';
import { useContrastColors, useScaledTypography, useSettings } from '@/features/settings';
import { colors, radii, screenPadding, shadows, spacing } from '@/theme';

const newChat = () => router.push('/conversas/chat');
const openConversation = (id: string) => router.push({ pathname: '/conversas/[id]', params: { id } });
const openPrivacy = () => router.navigate('/perfil/privacidade');

function confirmDelete(conversation: SavedConversation) {
  Alert.alert('Apagar esta conversa?', `"${conversation.title}" será removida deste aparelho.`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Apagar', style: 'destructive', onPress: () => deleteConversation(conversation.id) },
  ]);
}

function confirmClearAll() {
  Alert.alert('Apagar todas as conversas?', 'O histórico salvo neste aparelho será removido. Não dá para desfazer.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Apagar todas', style: 'destructive', onPress: clearConversations },
  ]);
}

/**
 * Links antigos (/conversas?topic=sintomas, /conversas?nova=1) abrem direto um
 * chat novo; a lista fica embaixo para o "voltar".
 */
function useNewChatParams() {
  const { topic, nova } = useLocalSearchParams<{ topic?: string; nova?: string }>();
  useEffect(() => {
    if (!topic && !nova) return;
    router.setParams({ topic: undefined, nova: undefined });
    router.push({ pathname: '/conversas/chat', params: topic ? { topic } : {} });
  }, [nova, topic]);
}

/** Aba Conversas: histórico salvo (com consentimento) e "Nova conversa". */
export default function ConversasScreen() {
  useNewChatParams();
  const { ready, items } = useConversations();
  const enabled = useSettings().settings.privacy.saveConversationHistory;
  const type = useScaledTypography();
  const palette = useContrastColors();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText style={[type.title, styles.title, { color: palette.textHeading }]} accessibilityRole="header">
          Conversas
        </AppText>

        <Button label="Nova conversa" icon={MessageSquarePlus} onPress={newChat} accessibilityHint="Abre o chat com o assistente" />

        {!ready ? null : items.length === 0 ? (
          <HistoryEmptyState enabled={enabled} onOpenPrivacy={openPrivacy} />
        ) : (
          <>
            {enabled ? null : (
              <PressableScale onPress={openPrivacy} accessibilityLabel="Histórico desligado. Novas conversas não são salvas. Abrir Privacidade" pressedScale={0.98}>
                <InfoNote
                  title="Histórico desligado"
                  message="Novas conversas não são salvas. Toque para ativar em Privacidade."
                />
              </PressableScale>
            )}
            <View style={styles.section}>
              <AppText style={[type.caption, styles.sectionTitle, { color: palette.textSecondary }]}>
                Salvas neste aparelho
              </AppText>
              <View style={[styles.list, { borderColor: palette.border }]}>
                {items.map((conversation, index) => (
                  <Fragment key={conversation.id}>
                    {index > 0 ? <View style={[styles.divider, { backgroundColor: palette.border }]} /> : null}
                    <ConversationRow conversation={conversation} onOpen={openConversation} onLongPress={confirmDelete} />
                  </Fragment>
                ))}
              </View>
            </View>
            <PressableScale
              onPress={confirmClearAll}
              accessibilityLabel="Apagar todas as conversas"
              pressedScale={0.96}
              containerStyle={styles.clearContainer}
              style={styles.clear}>
              <Trash2 size={18} color={colors.dangerPressed} strokeWidth={1.9} />
              <AppText style={[type.bodyMedium, styles.clearLabel]}>Apagar todas</AppText>
            </PressableScale>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: screenPadding, paddingTop: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.xl },
  title: { paddingHorizontal: spacing.xs },
  section: { gap: spacing.sm },
  sectionTitle: { paddingHorizontal: spacing.xs },
  list: {
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadows.card,
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 72 },
  clearContainer: { alignSelf: 'center' },
  clear: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44, paddingHorizontal: spacing.md },
  clearLabel: { color: colors.dangerPressed },
});
