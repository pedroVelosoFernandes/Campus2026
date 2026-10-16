import { BellPlus, BellRing, Building2, CalendarDays, Syringe, X, type LucideIcon } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconTile } from '@/components/IconTile';
import { PressableScale } from '@/components/PressableScale';
import type { NotificationView } from '@/features/notifications';
import type { AppNotificationKind } from '@/mocks/notifications';
import { colors, fontFamily, radii, shadows, spacing, typography } from '@/theme';

const ICONS: Record<AppNotificationKind, LucideIcon> = {
  vacina: Syringe,
  consulta: CalendarDays,
  ubs: Building2,
};

const TILE = 48;
/** Menta bem leve: destaca as não lidas sem competir com os botões menta. */
const UNREAD_SURFACE = '#F6FBFB';

export type NotificationItemProps = {
  item: NotificationView;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onToggleReminder: (item: NotificationView) => void;
};

function ReminderPill({ active, onPress }: { active: boolean; onPress: () => void }) {
  const Icon = active ? BellRing : BellPlus;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={active ? 'Lembrete agendado para amanhã às 9h. Toque para cancelar' : 'Lembrar da vacina'}
      accessibilityState={{ selected: active }}
      pressedScale={0.96}
      containerStyle={styles.pillContainer}
      style={[styles.pill, active && styles.pillActive]}>
      <Icon size={18} color={active ? colors.onPrimary : colors.primary} strokeWidth={1.9} />
      <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>
        {active ? 'Lembrete amanhã, 9h' : 'Lembrar da vacina'}
      </Text>
    </PressableScale>
  );
}

/** Cartão de notificação: ponto teal quando não lida; toque marca como lida. */
function NotificationItemBase({ item, onRead, onDismiss, onToggleReminder }: NotificationItemProps) {
  const status = item.read ? '' : 'Não lida. ';
  return (
    <View style={[styles.card, !item.read && styles.cardUnread]} testID={`notificacao-${item.id}`}>
      <View style={styles.row}>
        <PressableScale
          onPress={() => onRead(item.id)}
          accessibilityLabel={`${status}${item.title}. ${item.body} ${item.when}`}
          accessibilityHint={item.read ? undefined : 'Marca como lida'}
          pressedScale={0.985}
          containerStyle={styles.flex}
          style={styles.main}>
          <IconTile icon={ICONS[item.kind]} size={TILE} />
          <View style={styles.texts}>
            <View style={styles.titleRow}>
              {item.read ? null : <View style={styles.dot} />}
              <Text style={[styles.title, item.read && styles.titleRead]}>{item.title}</Text>
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.when}>{item.when}</Text>
          </View>
        </PressableScale>
        <PressableScale
          onPress={() => onDismiss(item.id)}
          accessibilityLabel={`Remover notificação: ${item.title}`}
          pressedScale={0.88}
          hitSlop={4}
          style={styles.dismiss}>
          <X size={18} color={colors.textMuted} strokeWidth={1.9} />
        </PressableScale>
      </View>
      {item.reminder ? (
        <ReminderPill active={!!item.reminderId} onPress={() => onToggleReminder(item)} />
      ) : null}
    </View>
  );
}

export const NotificationItem = memo(NotificationItemBase);

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.lg,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  cardUnread: { borderColor: colors.mintStrong, backgroundColor: UNREAD_SURFACE },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
  main: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md + 2 },
  texts: { flex: 1, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 7.5, backgroundColor: colors.primaryBright },
  title: {
    ...typography.bodyMedium,
    fontFamily: fontFamily.semibold,
    fontSize: 16.5,
    flexShrink: 1,
    color: colors.textHeading,
  },
  titleRead: { fontFamily: fontFamily.medium, color: colors.textBody },
  body: { ...typography.caption, fontSize: 14.5, lineHeight: 20, color: colors.textSecondary },
  when: { ...typography.caption, fontSize: 13, color: colors.textMuted, marginTop: spacing.xxs },
  dismiss: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -spacing.md },
  pillContainer: { alignSelf: 'flex-start', marginLeft: TILE + spacing.md + 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.mint,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillLabel: { ...typography.bodyMedium, fontSize: 15, color: colors.textHeading },
  pillLabelActive: { color: colors.onPrimary },
});
