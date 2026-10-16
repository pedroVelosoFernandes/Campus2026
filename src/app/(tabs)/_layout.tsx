import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { House, MessageSquare, User } from 'lucide-react-native';

import { HouseFilled } from '@/components/icons/HouseFilled';
import { TabBar, type TabBarTab } from '@/components/TabBar';
import { colors } from '@/theme';

const TABS: readonly TabBarTab[] = [
  { key: '(inicio)', label: 'Início', icon: House, activeIcon: HouseFilled },
  { key: 'conversas/index', label: 'Conversas', icon: MessageSquare },
  { key: 'perfil', label: 'Perfil', icon: User },
];

function AppTabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const active = state.routes[state.index];
  const keyByName = new Map(state.routes.map((route) => [route.name, route.key]));

  return (
    <TabBar
      tabs={TABS}
      activeKey={active?.name ?? TABS[0].key}
      bottomInset={insets.bottom}
      onTabPress={(name, focused) => {
        const routeKey = keyByName.get(name);
        if (!routeKey) return;
        const event = emitter.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true });
        if (!focused && !event.defaultPrevented) navigateToTab(routeKey);
      }}
      onTabLongPress={(name) => {
        const routeKey = keyByName.get(name);
        if (routeKey) emitter.emit({ type: 'tabLongPress', target: routeKey });
      }}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}>
      <Tabs.Screen name="(inicio)" options={{ title: 'Início' }} />
      <Tabs.Screen name="conversas/index" options={{ title: 'Conversas' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
