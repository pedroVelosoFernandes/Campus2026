import { Bot, User } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

export type AvatarProps = {
  /** user: silhueta de pessoa; assistant: robô do assistente. */
  kind?: 'user' | 'assistant';
  size?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

function AvatarBase({ kind = 'user', size = 36, accessibilityLabel, style }: AvatarProps) {
  const Icon = kind === 'assistant' ? Bot : User;
  const iconSize = Math.round(size * 0.52);
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
          backgroundColor: kind === 'assistant' ? colors.bubbleAssistant : colors.iconTile,
        },
        style,
      ]}>
      <Icon size={iconSize} color={colors.primary} fill={colors.primary} strokeWidth={1.5} />
    </View>
  );
}

export const Avatar = memo(AvatarBase);

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
