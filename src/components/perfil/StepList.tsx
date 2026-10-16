import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useContrastColors, useScaledTypography } from '@/features/settings';
import { colors, fontFamily, spacing } from '@/theme';

export type StepListProps = {
  steps: readonly { title: string; text: string }[];
};

/** Passos numerados dentro de um cartão (ex.: como funciona a consulta de rotina). */
function StepListBase({ steps }: StepListProps) {
  const type = useScaledTypography();
  const palette = useContrastColors();
  return (
    <View style={styles.list}>
      {steps.map((step, index) => (
        <View
          key={step.title}
          style={styles.step}
          accessible
          accessibilityLabel={`Passo ${index + 1}: ${step.title}. ${step.text}`}>
          <View style={styles.badge}>
            <Text style={styles.number}>{index + 1}</Text>
          </View>
          <View style={styles.texts}>
            <Text style={[type.bodyMedium, { color: palette.textHeading }]}>{step.title}</Text>
            <Text style={[type.caption, { color: palette.textSecondary }]}>{step.text}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export const StepList = memo(StepListBase);

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.lg },
  step: { flexDirection: 'row', gap: spacing.md },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mintStrong,
  },
  number: { fontFamily: fontFamily.semibold, fontSize: 14, color: colors.primary },
  texts: { flex: 1, gap: spacing.xxs },
});
