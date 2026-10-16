import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { colors, radii, spacing, typography } from '@/theme';

export type ConsentCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
};

/** Caixa de seleção grande (alvo ≥ 44 pt) para o aceite obrigatório. */
function ConsentCheckboxBase({ checked, onChange, label }: ConsentCheckboxProps) {
  const toggle = () => {
    void Haptics.selectionAsync().catch(() => {});
    onChange(!checked);
  };
  return (
    <PressableScale
      onPress={toggle}
      pressedScale={0.98}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={[styles.row, checked && styles.rowChecked]}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Check size={18} color={colors.onPrimary} strokeWidth={2.5} /> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </PressableScale>
  );
}

export const ConsentCheckbox = memo(ConsentCheckboxBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowChecked: { borderColor: colors.primaryBright, backgroundColor: colors.mint },
  box: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { ...typography.body, color: colors.textHeading, flex: 1 },
});
