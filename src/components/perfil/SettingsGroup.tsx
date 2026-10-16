import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useContrastColors, useScaledTypography } from '@/features/settings';
import { colors, fontFamily, radii, shadows, spacing } from '@/theme';

export type SettingsGroupProps = {
  title?: string;
  /** Nota curta abaixo do cartão. */
  footer?: string;
  children: ReactNode;
  /** Recuo da divisória à esquerda (padrão: alinhado ao texto das linhas com ícone). */
  dividerInset?: number;
};

/** Cartão branco com borda fina e divisórias entre as linhas, como a lista do Perfil. */
export function SettingsGroup({ title, footer, children, dividerInset = 54 }: SettingsGroupProps) {
  const type = useScaledTypography();
  const palette = useContrastColors();
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.group}>
      {title ? (
        <Text style={[type.caption, styles.title, { color: palette.textSecondary }]} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      <View style={[styles.card, { borderColor: palette.border }]}>
        {items.map((item, index) => (
          // Children.toArray já dá a cada filho uma chave estável.
          <Fragment key={item.key}>
            {index > 0 ? <View style={[styles.divider, { marginLeft: dividerInset, backgroundColor: palette.border }]} /> : null}
            {item}
          </Fragment>
        ))}
      </View>
      {footer ? <Text style={[type.caption, styles.footer, { color: palette.textMuted }]}>{footer}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  title: { fontFamily: fontFamily.medium, paddingHorizontal: spacing.xs },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadows.card,
  },
  divider: { height: StyleSheet.hairlineWidth },
  footer: { paddingHorizontal: spacing.xs },
});
