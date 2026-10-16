import type { LucideIcon } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/theme';

export type IconTileProps = {
  icon: LucideIcon;
  size?: number;
};

/** Quadrado azul-claro com ícone de traço fino, usado nos cartões de opção e atalhos. */
function IconTileBase({ icon: Icon, size = 48 }: IconTileProps) {
  return (
    <View style={[styles.tile, { width: size, height: size }]}>
      <Icon size={Math.round(size * 0.54)} color={colors.iconTileForeground} strokeWidth={1.6} />
    </View>
  );
}

export const IconTile = memo(IconTileBase);

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.iconTile,
  },
});
