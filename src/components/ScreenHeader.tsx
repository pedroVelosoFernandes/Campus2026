import { ChevronLeft } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

import { PressableScale } from './PressableScale';

export type ScreenHeaderProps = {
  title?: string;
  /** center: título centralizado (Assistente, Teleconsulta); left: ao lado do chevron. */
  titleAlign?: 'center' | 'left';
  onBack?: () => void;
  backLabel?: string;
};

const SIDE = 44;

/** Cabeçalho das telas internas: chevron de voltar + título. */
function ScreenHeaderBase({ title, titleAlign = 'center', onBack, backLabel = 'Voltar' }: ScreenHeaderProps) {
  const centered = titleAlign === 'center';
  return (
    <View style={styles.row}>
      {onBack ? (
        <PressableScale
          onPress={onBack}
          accessibilityLabel={backLabel}
          hitSlop={8}
          pressedScale={0.9}
          style={styles.back}>
          <ChevronLeft size={26} color={colors.textHeading} strokeWidth={1.75} />
        </PressableScale>
      ) : (
        <View style={styles.back} />
      )}
      {title ? (
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[styles.title, centered ? styles.titleCenter : styles.titleLeft]}>
          {title}
        </Text>
      ) : (
        <View style={styles.flex} />
      )}
      {centered ? <View style={styles.back} /> : null}
    </View>
  );
}

export const ScreenHeader = memo(ScreenHeaderBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.sm,
  },
  back: { width: SIDE, height: SIDE, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  title: { ...typography.headline, flex: 1, color: colors.textHeading },
  titleCenter: { textAlign: 'center' },
  titleLeft: { marginLeft: spacing.xs },
});
