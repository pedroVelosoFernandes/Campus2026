import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Linking, StyleSheet, View, type ListRenderItem } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatComposer } from '@/components/conversas/ChatComposer';
import {
  greetingFor,
  isAssistantTyping,
  priorChatMessages,
  routeForAction,
  shouldShowQuickReplies,
  toChatMessages,
  type ChatMessage,
  type ChatRow,
} from '@/components/conversas/chat-model';
import { QuickReplies } from '@/components/conversas/QuickReplies';
import { SuggestedActionCard } from '@/components/conversas/SuggestedActionCard';
import { TypingIndicator } from '@/components/conversas/TypingIndicator';
import { useKeyboardInset } from '@/components/conversas/useKeyboardInset';
import { useStickToBottom } from '@/components/conversas/useStickToBottom';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  createContinuationTransport,
  useConversation,
  useConversationRecorder,
  type SavedConversation,
} from '@/features/history';
import { useReadAloudAssistant } from '@/features/read-aloud';
import { createVoiceDependencies, useTextAssistant, type UseTextAssistantOptions } from '@/features/voice';
import { colors, screenPadding, spacing, typography } from '@/theme';

const goBack = () => (router.canGoBack() ? router.back() : router.navigate('/'));
const openVoice = () => router.push('/assistente');
const callSamu = () => void Linking.openURL('tel:192').catch(() => {});
const openEmergencyContacts = () => router.push('/emergencia');
const ENTERING = FadeInDown.duration(220).reduceMotion(ReduceMotion.System);

const renderRow: ListRenderItem<ChatRow> = ({ item }) =>
  item.kind === 'divider' ? (
    <View style={styles.divider} accessibilityRole="text">
      <View style={styles.dividerLine} />
      <AppText style={styles.dividerText}>Conversa retomada</AppText>
      <View style={styles.dividerLine} />
    </View>
  ) : (
    <Animated.View entering={item.prior ? undefined : ENTERING}>
      <ChatBubble role={item.role} text={item.text} />
    </Animated.View>
  );

/**
 * Ao continuar uma conversa salva com o backend real, a primeira mensagem leva
 * o contexto anterior. No modo demonstração o roteiro simulado segue igual.
 */
function useContinuationOptions(prior: SavedConversation | null): UseTextAssistantOptions {
  const [options] = useState<UseTextAssistantOptions>(() => {
    if (!prior) return {};
    const deps = createVoiceDependencies('text');
    if (deps.mode !== 'live') return {};
    return { ...deps, transport: createContinuationTransport(deps.transport, prior.messages) };
  });
  return options;
}

type ChatViewProps = { topic?: string; prior: SavedConversation | null };

function ChatView({ topic, prior }: ChatViewProps) {
  const options = useContinuationOptions(prior);
  const { state, transcript, suggestedAction, sendMessage } = useTextAssistant(options);
  useConversationRecorder({ channel: 'texto', transcript, suggestedAction, prior });
  // "Ler respostas em voz alta" (Perfil > Acessibilidade); para ao sair da tela.
  useReadAloudAssistant(transcript, { active: useIsFocused() });
  const listRef = useRef<FlatList<ChatRow>>(null);
  const { containerRef, insetStyle } = useKeyboardInset();

  const fresh = useMemo(() => toChatMessages(transcript), [transcript]);
  const rows = useMemo<ChatRow[]>(
    () => (prior ? [...priorChatMessages(prior.messages), { id: 'resume_divider', kind: 'divider' }, ...fresh] : [greetingFor(topic), ...fresh]),
    [fresh, prior, topic],
  );
  const messages = rows.filter((row): row is ChatMessage => row.kind !== 'divider');
  const typing = isAssistantTyping(state, messages);
  const showReplies = shouldShowQuickReplies(messages, typing);
  const actionRoute = suggestedAction ? routeForAction(suggestedAction) : null;

  const send = useCallback((text: string) => void sendMessage(text), [sendMessage]);
  const { onContentSizeChange, onListLayout } = useStickToBottom(listRef);

  const footer = (
    <View style={styles.footer}>
      {typing ? <TypingIndicator /> : null}
      {showReplies ? <QuickReplies onSelect={send} /> : null}
      {suggestedAction && !typing ? (
        <SuggestedActionCard
          action={suggestedAction}
          onOpen={actionRoute ? () => router.push(actionRoute) : undefined}
          onCallEmergency={callSamu}
          onOpenEmergencyContacts={openEmergencyContacts}
        />
      ) : null}
    </View>
  );

  return (
    <Animated.View ref={containerRef} style={[styles.flex, insetStyle]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Orientação de atendimento" titleAlign="left" onBack={goBack} />
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          ListFooterComponent={footer}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={onContentSizeChange}
          onLayout={onListLayout}
        />
        <View style={styles.composer}>
          <ChatComposer onSend={send} onMicPress={openVoice} />
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

/**
 * Chat por texto. Rotas: /conversas/chat (nova), ?topic=sintomas (pergunta sobre
 * sintomas) e ?continuar=<id> (retoma uma conversa salva no histórico).
 */
export default function ConversaChatScreen() {
  const { topic, continuar } = useLocalSearchParams<{ topic?: string; continuar?: string }>();
  const { ready, conversation } = useConversation(continuar);
  // Espera o histórico carregar para a conversa retomada já abrir com as falas antigas.
  if (continuar && !ready) return <View style={styles.flex} />;
  return <ChatView key={conversation?.id ?? 'nova'} topic={topic} prior={conversation} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  list: { gap: spacing.lg, paddingHorizontal: screenPadding, paddingTop: spacing.xl, paddingBottom: spacing.lg },
  footer: { gap: spacing.lg, paddingTop: spacing.xs },
  composer: { paddingHorizontal: screenPadding, backgroundColor: colors.background },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
  dividerText: { ...typography.caption, color: colors.textSecondary },
});
