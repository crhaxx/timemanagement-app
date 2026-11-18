import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

import { colors } from '@/constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        tabBarStyle: styles.bar,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Přehled',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={focused ? colors.accent : colors.muted} />
          ),
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Brain dump',
          tabBarLabel: 'Přidat',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={26} color={focused ? colors.accent : colors.muted} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: Platform.OS === 'ios' ? 86 : 68,
    paddingTop: 6,
    elevation: 0,
  },
  item: {
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
