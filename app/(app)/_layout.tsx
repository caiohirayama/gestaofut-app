import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useActiveGroupPermissions } from '@/features/groups/hooks/useActiveGroupPermissions';
import { tabVisibility } from '@/features/groups/utils/tab-visibility';
import { useGroupStore } from '@/store/group-store';
import { colors } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IconName) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color as string} />;
  }
  return TabIcon;
}

export default function AppLayout() {
  const activeGroupId = useGroupStore((state) => state.activeGroupId);
  const { can } = useActiveGroupPermissions();

  if (!activeGroupId) {
    return <Redirect href="/(group-setup)" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: tabIcon('home-outline') }} />
      <Tabs.Screen
        name="games"
        options={{ title: 'Jogos', tabBarIcon: tabIcon('football-outline'), href: tabVisibility(can('match.read')) }}
      />
      <Tabs.Screen
        name="players"
        options={{
          title: 'Jogadores',
          tabBarIcon: tabIcon('people-outline'),
          href: tabVisibility(can('member.manage')),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: 'Financeiro',
          tabBarIcon: tabIcon('wallet-outline'),
          href: tabVisibility(can('finance.read')),
        }}
      />
      <Tabs.Screen name="more" options={{ title: 'Mais', tabBarIcon: tabIcon('ellipsis-horizontal-outline') }} />
    </Tabs>
  );
}
