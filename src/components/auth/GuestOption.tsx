import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, spacing, typography } from '@/theme';

/** Divisor "ou" + "Continuar sem entrar": o uso sem conta é um caminho de primeira classe. */
function GuestOptionBase({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow} accessible={false}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>ou</Text>
        <View style={styles.dividerLine} />
      </View>
      <Button
        label="Continuar sem entrar"
        variant="secondary"
        onPress={onPress}
        accessibilityHint="Usa o assistente sem criar conta"
      />
      <Text style={styles.note}>O assistente funciona sem conta. Só o histórico e o perfil precisam de login.</Text>
    </View>
  );
}

export const GuestOption = memo(GuestOptionBase);

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth * 2, backgroundColor: colors.border },
  dividerText: { ...typography.caption, color: colors.textMuted },
  note: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.lg },
});
