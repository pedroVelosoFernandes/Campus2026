import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { useContrastColors } from '@/features/settings';
import { colors, fontFamily, spacing, typography } from '@/theme';

export type StepListProps = {
  steps: readonly { title: string; text: string }[];
};

/** Passos numerados dentro de um cartão (ex.: como funciona a consulta de rotina). */
function StepListBase({ steps }: StepListProps) {
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
            <AppText style={styles.number}>{index + 1}</AppText>
          </View>
          <View style={styles.texts}>
            <AppText style={[typography.bodyMedium, { color: palette.textHeading }]}>{step.title}</AppText>
            <AppText style={[typography.caption, { color: palette.textSecondary }]}>{step.text}</AppText>
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
