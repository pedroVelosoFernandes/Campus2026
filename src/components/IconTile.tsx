import type { LucideIcon } from 'lucide-react-native';
import { memo, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme';

export type IconTileProps = {
  icon: LucideIcon;
  size?: number;
};

/** Quadrado azul-claro (degradê vertical sutil) com ícone de traço fino, usado nos cartões de opção e atalhos. */
function IconTileBase({ icon: Icon, size = 48 }: IconTileProps) {
  const gradientId = `icon-tile-${useId().replace(/:/g, '')}`;
  const radius = Math.round(size * 0.28);
  return (
    <View style={[styles.tile, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.iconTileTop} />
            <Stop offset="1" stopColor={colors.iconTileBottom} />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} rx={radius} fill={`url(#${gradientId})`} />
      </Svg>
      <Icon size={Math.round(size * 0.56)} color={colors.iconTileForeground} strokeWidth={1.7} />
    </View>
  );
}

export const IconTile = memo(IconTileBase);

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
