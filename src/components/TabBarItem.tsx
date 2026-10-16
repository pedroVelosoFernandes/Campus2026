import type { LucideIcon } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet } from 'react-native';

import { useContrastColors } from '@/features/settings';
import { colors, spacing, typography } from '@/theme';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

export type TabBarItemProps = {
  label: string;
  icon: LucideIcon;
  focused: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  index: number;
  count: number;
  testID?: string;
};

function TabBarItemBase({ label, icon: Icon, focused, onPress, onLongPress, index, count, testID }: TabBarItemProps) {
  const palette = useContrastColors();
  const color = focused ? colors.primary : palette.tabInactive;
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      testID={testID}
      accessibilityRole="tab"
      accessibilityLabel={`${label}, aba ${index + 1} de ${count}`}
      accessibilityState={{ selected: focused }}
      pressedScale={0.92}
      containerStyle={styles.container}
      style={styles.item}>
      <Icon
        size={26}
        color={color}
        fill={focused ? colors.primary : 'transparent'}
        strokeWidth={1.75}
      />
      <AppText style={[styles.label, { color }, focused && styles.labelFocused]}>{label}</AppText>
    </PressableScale>
  );
}

export const TabBarItem = memo(TabBarItemBase);

const styles = StyleSheet.create({
  container: { flex: 1 },
  item: { alignItems: 'center', justifyContent: 'center', gap: spacing.xxs, minHeight: 50 },
  label: { ...typography.tab },
  labelFocused: { fontFamily: typography.label.fontFamily },
});
