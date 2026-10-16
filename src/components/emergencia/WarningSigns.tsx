import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radii, spacing, typography } from '@/theme';

import { WARNING_SIGNS } from './contacts';

/** Lista curta de sinais de alerta (não é diagnóstico). */
function WarningSignsBase() {
  return (
    <View style={styles.box}>
      <AppText style={styles.title} accessibilityRole="header">
        Sinais de alerta
      </AppText>
      <AppText style={styles.lead}>Se você ou alguém perto tiver algum destes sinais, ligue 192 agora:</AppText>
      <View style={styles.list}>
        {WARNING_SIGNS.map((sign) => (
          <View key={sign} style={styles.item}>
            <View style={styles.bullet} />
            <AppText style={styles.sign}>{sign}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

export const WarningSigns = memo(WarningSignsBase);

const styles = StyleSheet.create({
  box: {
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.mint,
  },
  title: { ...typography.headline, color: colors.textHeading },
  lead: { ...typography.body, fontSize: 15, color: colors.textSecondary },
  list: { gap: spacing.sm, marginTop: spacing.xs },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8, backgroundColor: colors.primaryBright },
  sign: { ...typography.body, flex: 1, color: colors.textBody },
});
