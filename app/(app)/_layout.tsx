import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { colors } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IconName) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color as string} />;
  }
  return TabIcon;
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Início', tabBarIcon: tabIcon('home-outline') }}
      />
      <Tabs.Screen
        name="games"
        options={{ title: 'Jogos', tabBarIcon: tabIcon('football-outline') }}
      />
      <Tabs.Screen
        name="players"
        options={{ title: 'Jogadores', tabBarIcon: tabIcon('people-outline') }}
      />
      <Tabs.Screen
        name="finance"
        options={{ title: 'Financeiro', tabBarIcon: tabIcon('wallet-outline') }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: 'Mais', tabBarIcon: tabIcon('ellipsis-horizontal-outline') }}
      />
    </Tabs>
  );
}
