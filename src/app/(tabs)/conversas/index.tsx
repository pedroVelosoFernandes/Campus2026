import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Linking, Platform, StyleSheet, View, type ListRenderItem } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatBubble } from '@/components/ChatBubble';
import { ChatComposer } from '@/components/conversas/ChatComposer';
import {
  greetingFor,
  isAssistantTyping,
  routeForAction,
  shouldShowQuickReplies,
  toChatMessages,
  type ChatMessage,
} from '@/components/conversas/chat-model';
import { QuickReplies } from '@/components/conversas/QuickReplies';
import { SuggestedActionCard } from '@/components/conversas/SuggestedActionCard';
import { TypingIndicator } from '@/components/conversas/TypingIndicator';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTextAssistant } from '@/features/voice';
import { colors, screenPadding, spacing } from '@/theme';

const goBack = () => (router.canGoBack() ? router.back() : router.navigate('/'));
const openVoice = () => router.push('/assistente');
const callSamu = () => void Linking.openURL('tel:192');
const ENTERING = FadeInDown.duration(220).reduceMotion(ReduceMotion.System);

const renderMessage: ListRenderItem<ChatMessage> = ({ item }) => (
  <Animated.View entering={ENTERING}>
    <ChatBubble role={item.role} text={item.text} />
  </Animated.View>
);

export default function ConversasScreen() {
  const { topic } = useLocalSearchParams<{ topic?: string }>();
  const { state, transcript, suggestedAction, sendMessage } = useTextAssistant();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const messages = useMemo(() => [greetingFor(topic), ...toChatMessages(transcript)], [topic, transcript]);
  const typing = isAssistantTyping(state, messages);
  const showReplies = shouldShowQuickReplies(messages, typing);
  const actionRoute = suggestedAction ? routeForAction(suggestedAction) : null;

  const send = useCallback((text: string) => void sendMessage(text), [sendMessage]);
  const scrollToEnd = useCallback(() => listRef.current?.scrollToEnd({ animated: true }), []);

  const footer = (
    <View style={styles.footer}>
      {typing ? <TypingIndicator /> : null}
      {showReplies ? <QuickReplies onSelect={send} /> : null}
      {suggestedAction && !typing ? (
        <SuggestedActionCard
          action={suggestedAction}
          onOpen={actionRoute ? () => router.push(actionRoute) : undefined}
          onCallEmergency={callSamu}
        />
      ) : null}
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Orientação de atendimento" titleAlign="left" onBack={goBack} />
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          ListFooterComponent={footer}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
          onLayout={scrollToEnd}
        />
        <View style={styles.composer}>
          <ChatComposer onSend={send} onMicPress={openVoice} />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  list: { gap: spacing.lg, paddingHorizontal: screenPadding, paddingTop: spacing.xl, paddingBottom: spacing.lg },
  footer: { gap: spacing.lg, paddingTop: spacing.xs },
  composer: { paddingHorizontal: screenPadding, backgroundColor: colors.background },
});
