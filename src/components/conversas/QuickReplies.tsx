import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { PressableScale } from '@/components/PressableScale';
import { colors, radii, spacing, typography } from '@/theme';

export type QuickRepliesProps = {
  options?: readonly string[];
  onSelect: (option: string) => void;
};

const DEFAULT_OPTIONS = ['Sim', 'Não'] as const;

/** Respostas rápidas para perguntas fechadas: dois botões contornados lado a lado. */
function QuickRepliesBase({ options = DEFAULT_OPTIONS, onSelect }: QuickRepliesProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}
      style={styles.row}
      accessibilityLabel="Respostas rápidas">
      {options.map((option) => (
        <PressableScale
          key={option}
          onPress={() => onSelect(option)}
          accessibilityLabel={option}
          accessibilityHint="Envia esta resposta ao assistente"
          containerStyle={styles.flex}
          style={styles.chip}>
          <View>
            <Text style={styles.label}>{option}</Text>
          </View>
        </PressableScale>
      ))}
    </Animated.View>
  );
}

export const QuickReplies = memo(QuickRepliesBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  chip: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md + 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  label: { ...typography.bodyMedium, fontSize: 17, color: colors.textHeading },
});
