import { Bell } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

import { Avatar } from './Avatar';
import { PressableScale } from './PressableScale';

export type HomeHeaderProps = {
  firstName: string;
  hasNotifications?: boolean;
  onNotificationsPress?: () => void;
};

/** Saudação "Olá, Ana" com avatar e sino de notificações (ponto vermelho quando há novidades). */
function HomeHeaderBase({ firstName, hasNotifications, onNotificationsPress }: HomeHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.greeting}>
        <Avatar size={38} />
        <Text style={styles.hello} accessibilityRole="header">
          Olá, {firstName}
        </Text>
      </View>
      <PressableScale
        onPress={onNotificationsPress}
        accessibilityLabel={hasNotifications ? 'Notificações, há novidades' : 'Notificações'}
        pressedScale={0.9}
        hitSlop={4}
        style={styles.bell}>
        <Bell size={25} color={colors.textHeading} strokeWidth={1.6} />
        {hasNotifications ? <View style={styles.dot} /> : null}
      </PressableScale>
    </View>
  );
}

export const HomeHeader = memo(HomeHeaderBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hello: { ...typography.bodyMedium, fontSize: 17, color: colors.textHeading },
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
