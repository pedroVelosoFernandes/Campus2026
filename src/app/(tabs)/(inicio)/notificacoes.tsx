import { router } from 'expo-router';
import { CheckCheck, ChevronLeft, Settings } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { EmptyNotifications } from '@/components/notificacoes/EmptyNotifications';
import { NotificationItem } from '@/components/notificacoes/NotificationItem';
import { ReminderNotice } from '@/components/notificacoes/ReminderNotice';
import { ReminderPermissionSheet } from '@/components/notificacoes/ReminderPermissionSheet';
import { PressableScale } from '@/components/PressableScale';
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

/** Preferências em Perfil > Notificações (outra aba). */
const openPreferences = () => router.navigate('/perfil/notificacoes');

const unreadLabel = (count: number) =>
  count === 0 ? 'Nenhuma não lida' : count === 1 ? '1 não lida' : `${count} não lidas`;

export default function NotificacoesScreen() {
  const { items, unreadCount } = useNotifications();
  const reminder = useReminderFlow();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <PressableScale onPress={goBack} accessibilityLabel="Voltar" hitSlop={8} pressedScale={0.9} style={styles.headerButton}>
          <ChevronLeft size={26} color={colors.textHeading} strokeWidth={1.75} />
        </PressableScale>
        <AppText accessibilityRole="header" numberOfLines={1} style={styles.headerTitle}>
          Notificações
        </AppText>
        <PressableScale
          onPress={openPreferences}
          accessibilityLabel="Preferências de notificação"
          accessibilityHint="Abre Perfil, Notificações"
          hitSlop={8}
          pressedScale={0.9}
          style={styles.headerButton}>
          <Settings size={23} color={colors.textHeading} strokeWidth={1.75} />
        </PressableScale>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <EmptyNotifications />
        ) : (
          <>
            <View style={styles.summary}>
              <AppText style={styles.count}>{unreadLabel(unreadCount)}</AppText>
              {unreadCount > 0 ? (
                <PressableScale
                  onPress={() => markAllAsRead(items.map((item) => item.id))}
                  accessibilityLabel="Marcar todas como lidas"
                  pressedScale={0.95}
                  style={styles.markAll}>
                  <CheckCheck size={18} color={colors.primary} strokeWidth={1.9} />
                  <AppText style={styles.markAllLabel}>Marcar todas como lidas</AppText>
                </PressableScale>
              ) : null}
            </View>
            <ReminderNotice
              notice={reminder.notice}
              onOpenSettings={openNotificationSettings}
              onOpenPreferences={openPreferences}
            />
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
  // Mesmo desenho do ScreenHeader, com a engrenagem no lugar do espaçador direito.
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: spacing.sm },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.headline, flex: 1, textAlign: 'center', color: colors.textHeading },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  count: { ...typography.body, color: colors.textSecondary },
  markAll: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, minHeight: 44 },
  markAllLabel: { ...typography.bodyMedium, fontSize: 15, color: colors.primary },
});
