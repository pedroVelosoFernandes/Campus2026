import { BellOff } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { IconTile } from '@/components/IconTile';
import { colors, spacing, typography } from '@/theme';

/** Estado vazio: nenhuma notificação para mostrar. */
function EmptyNotificationsBase() {
  return (
    <View style={styles.box} testID="notificacoes-vazio">
      <IconTile icon={BellOff} size={72} />
      <AppText style={styles.title} accessibilityRole="header">
        Tudo em dia
      </AppText>
      <AppText style={styles.text}>
        Campanhas de vacinação, lembretes de consulta e avisos da sua UBS aparecem aqui.
      </AppText>
    </View>
  );
}

export const EmptyNotifications = memo(EmptyNotificationsBase);

const styles = StyleSheet.create({
  box: { alignItems: 'center', gap: spacing.md, paddingTop: 72, paddingHorizontal: spacing.xxl },
  title: { ...typography.headline, fontSize: 20, marginTop: spacing.sm, color: colors.textHeading },
  text: { ...typography.body, textAlign: 'center', color: colors.textSecondary },
});
