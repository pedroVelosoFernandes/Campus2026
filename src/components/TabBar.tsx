import type { LucideIcon } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, shadows, spacing } from '@/theme';

import { TabBarItem } from './TabBarItem';

export type TabBarTab = {
  key: string;
  label: string;
  icon: LucideIcon;
};

export type TabBarProps = {
  tabs: readonly TabBarTab[];
  activeKey: string;
  onTabPress: (key: string, focused: boolean) => void;
  onTabLongPress?: (key: string) => void;
  /** Inset inferior da área segura (home indicator). */
  bottomInset?: number;
};

/** Barra inferior: Início / Conversas / Perfil; aba ativa com ícone preenchido e rótulo teal. */
function TabBarBase({ tabs, activeKey, onTabPress, onTabLongPress, bottomInset = 0 }: TabBarProps) {
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: Math.max(bottomInset - spacing.md, spacing.sm) }]}>
      {tabs.map((tab, index) => {
        const focused = tab.key === activeKey;
        return (
          <TabBarItem
            key={tab.key}
            label={tab.label}
            icon={tab.icon}
            focused={focused}
            index={index}
            count={tabs.length}
            testID={`tab-${tab.key}`}
            onPress={() => onTabPress(tab.key, focused)}
            onLongPress={onTabLongPress ? () => onTabLongPress(tab.key) : undefined}
          />
        );
      })}
    </View>
  );
}

export const TabBar = memo(TabBarBase);

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadows.tabBar,
  },
});
