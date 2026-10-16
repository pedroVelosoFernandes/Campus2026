import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

export type AvatarProps = {
  /** user: silhueta de pessoa; assistant: robô do assistente. */
  kind?: 'user' | 'assistant';
  size?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Cabeça de robô do design: antena, orelhas e olhos vazados (grid 24×24). */
function RobotGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={3.6} r={1.7} fill={colors.primary} />
      <Rect x={11.2} y={4.5} width={1.6} height={3.5} fill={colors.primary} />
      <Rect x={1.8} y={12} width={2.6} height={4.6} rx={1.1} fill={colors.primary} />
      <Rect x={19.6} y={12} width={2.6} height={4.6} rx={1.1} fill={colors.primary} />
      <Rect x={3.6} y={7.6} width={16.8} height={13} rx={5.6} fill={colors.primary} />
      <Circle cx={9} cy={14.2} r={1.55} fill={colors.onPrimary} />
      <Circle cx={15} cy={14.2} r={1.55} fill={colors.onPrimary} />
    </Svg>
  );
}

/** Silhueta de pessoa preenchida: cabeça + ombros arredondados. */
function PersonGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={7.6} r={4.4} fill={colors.avatarPerson} />
      <Path d="M3.6 21.2c0-4.9 3.8-8 8.4-8s8.4 3.1 8.4 8v.3H3.6z" fill={colors.avatarPerson} />
    </Svg>
  );
}

function AvatarBase({ kind = 'user', size = 36, accessibilityLabel, style }: AvatarProps) {
  const glyph = Math.round(size * (kind === 'assistant' ? 0.6 : 0.56));
  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: kind === 'assistant' ? colors.avatarSurface : colors.iconTile,
        },
        style,
      ]}>
      {kind === 'assistant' ? <RobotGlyph size={glyph} /> : <PersonGlyph size={glyph} />}
    </View>
  );
}

export const Avatar = memo(AvatarBase);

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
