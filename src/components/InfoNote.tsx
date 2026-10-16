import { Info } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useContrastColors, useHighContrast } from '@/features/settings';
import { colors, radii, spacing, typography } from '@/theme';
import { AppText } from './AppText';

export type InfoNoteProps = {
  /** Linha em destaque (ex.: "Antes de sair"). */
  title?: string;
  message: string;
  style?: StyleProp<ViewStyle>;
};

/** Faixa informativa azul-clara com ícone "i" (telas de vacinação e teleconsulta). */
function InfoNoteBase({ title, message, style }: InfoNoteProps) {
  const palette = useContrastColors();
  const highContrast = useHighContrast();
  return (
    <View style={[styles.box, highContrast && { borderWidth: 1, borderColor: palette.info }, style]} accessibilityRole="text">
      <View style={styles.icon}>
        <Info size={16} color={colors.onPrimary} strokeWidth={2.25} />
      </View>
      <View style={styles.texts}>
        {title ? (
          <AppText style={[typography.bodyMedium, { fontSize: 15, color: palette.textHeading }]}>{title}</AppText>
        ) : null}
        <AppText style={[typography.caption, { color: palette.textSecondary }]}>{message}</AppText>
      </View>
    </View>
  );
}

export const InfoNote = memo(InfoNoteBase);

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.infoSurface,
  },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.info,
  },
  texts: { flex: 1, gap: spacing.xxs },
});
