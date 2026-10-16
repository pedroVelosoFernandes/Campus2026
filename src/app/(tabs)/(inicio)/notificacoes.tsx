import { router } from 'expo-router';
import { CheckCheck } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyNotifications } from '@/components/notificacoes/EmptyNotifications';
import { NotificationItem } from '@/components/notificacoes/NotificationItem';
import { ReminderNotice } from '@/components/notificacoes/ReminderNotice';
import { ReminderPermissionSheet } from '@/components/notificacoes/ReminderPermissionSheet';
import { PressableScale } from '@/components/PressableScale';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  dismissNotification,
  markAllAsRead,
  markAsRead,
  openNotificationSettings,
  useNotifications,
  useReminderFlow,
} from '@/features/notifications';
import { colors, screenPadding, spacing, typography } from '@/theme';

const layout = LinearTransition.duration(220).reduceMotion(ReduceMotion.System);
const entering = (index: number) =>
  FadeInDown.duration(300)
    .delay(60 + index * 50)
    .withInitialValues({ transform: [{ translateY: 10 }] })
    .reduceMotion(ReduceMotion.System);

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

const unreadLabel = (count: number) =>
  count === 0 ? 'Nenhuma não lida' : count === 1 ? '1 não lida' : `${count} não lidas`;

export default function NotificacoesScreen() {
  const { items, unreadCount } = useNotifications();
  const reminder = useReminderFlow();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Notificações" onBack={goBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <EmptyNotifications />
        ) : (
          <>
            <View style={styles.summary}>
              <Text style={styles.count}>{unreadLabel(unreadCount)}</Text>
              {unreadCount > 0 ? (
                <PressableScale
                  onPress={() => markAllAsRead(items.map((item) => item.id))}
                  accessibilityLabel="Marcar todas como lidas"
                  pressedScale={0.95}
                  style={styles.markAll}>
                  <CheckCheck size={18} color={colors.primary} strokeWidth={1.9} />
                  <Text style={styles.markAllLabel}>Marcar todas como lidas</Text>
                </PressableScale>
              ) : null}
            </View>
            <ReminderNotice notice={reminder.notice} onOpenSettings={openNotificationSettings} />
            {items.map((item, index) => (
              <Animated.View key={item.id} entering={entering(index)} layout={layout}>
                <NotificationItem
                  item={item}
                  onRead={markAsRead}
                  onDismiss={dismissNotification}
                  onToggleReminder={reminder.toggle}
                />
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>
      <ReminderPermissionSheet
        visible={reminder.explaining !== null}
        onAllow={reminder.confirm}
        onClose={reminder.cancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: screenPadding, paddingTop: spacing.sm, paddingBottom: spacing.xxxl, gap: spacing.md },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  count: { ...typography.body, color: colors.textSecondary },
  markAll: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, minHeight: 44 },
  markAllLabel: { ...typography.bodyMedium, fontSize: 15, color: colors.primary },
});
