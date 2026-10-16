import { Bell } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { greeting } from '@/features/settings';
import { colors, spacing, typography } from '@/theme';

import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { PressableScale } from './PressableScale';

export type HomeHeaderProps = {
  /** Nome escolhido pela pessoa (vazio = "Olá!"). */
  name: string;
  /** Mostra o convite "Como podemos te chamar?" sob a saudação. */
  onAskName?: () => void;
  hasNotifications?: boolean;
  /** Quantidade de não lidas (entra no rótulo de acessibilidade). */
  unreadCount?: number;
  onNotificationsPress?: () => void;
};

/** Saudação ("Olá, Maria" ou "Olá!") com avatar e sino de notificações (ponto vermelho quando há novidades). */
function bellLabel(hasNotifications?: boolean, unreadCount?: number) {
  if (unreadCount === 1) return 'Notificações, 1 não lida';
  if (unreadCount && unreadCount > 1) return `Notificações, ${unreadCount} não lidas`;
  return hasNotifications ? 'Notificações, há novidades' : 'Notificações';
}

function HomeHeaderBase({ name, onAskName, hasNotifications, unreadCount, onNotificationsPress }: HomeHeaderProps) {
  const showDot = hasNotifications ?? (unreadCount ?? 0) > 0;
  return (
    <View style={styles.row}>
      <View style={styles.greeting}>
        <Avatar size={38} />
        <View style={styles.texts}>
          <AppText style={styles.hello} accessibilityRole="header" numberOfLines={1}>
            {greeting(name)}
          </AppText>
          {onAskName ? (
            <PressableScale onPress={onAskName} accessibilityRole="button" hitSlop={10} pressedScale={0.97}>
              <AppText style={styles.ask}>Como podemos te chamar?</AppText>
            </PressableScale>
          ) : null}
        </View>
      </View>
      <PressableScale
        onPress={onNotificationsPress}
        accessibilityLabel={bellLabel(showDot, unreadCount)}
        pressedScale={0.9}
        hitSlop={4}
        style={styles.bell}>
        <Bell size={25} color={colors.textHeading} strokeWidth={1.6} />
        {showDot ? <View style={styles.dot} testID="notificacoes-ponto" /> : null}
      </PressableScale>
    </View>
  );
}

export const HomeHeader = memo(HomeHeaderBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, alignItems: 'flex-start' },
  hello: { ...typography.bodyMedium, fontSize: 17, color: colors.textHeading },
  ask: { ...typography.caption, fontFamily: typography.label.fontFamily, color: colors.primary },
  bell: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.notification,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
});
