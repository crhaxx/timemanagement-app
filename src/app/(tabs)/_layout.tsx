import { Tabs } from 'expo-router';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { colors } from '@/constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: { position: 'absolute' },
      }}>
      <Tabs.Screen name="home" options={{ title: 'Přehled' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Úkoly' }} />
      <Tabs.Screen name="goals" options={{ title: 'Cíle' }} />
      <Tabs.Screen name="routines" options={{ title: 'Rutiny' }} />
      <Tabs.Screen name="journal" options={{ title: 'Deník' }} />
    </Tabs>
  );
}
