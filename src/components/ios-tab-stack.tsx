import { Stack } from 'expo-router';

import { colors } from '@/constants/colors';

export function IosTabStack({ title, headerShown = true }: { title: string; headerShown?: boolean }) {
  return (
    <Stack
      screenOptions={{
        headerLargeTitleEnabled: true,
        headerLargeTitleShadowVisible: false,
        headerShadowVisible: false,
        headerTintColor: colors.accent,
        headerStyle: { backgroundColor: colors.background },
        headerLargeStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontWeight: '600', color: colors.text },
        headerLargeTitleStyle: { color: colors.text },
        headerUserInterfaceStyle: 'light',
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="index" options={{ title, headerShown, headerLargeTitleEnabled: true }} />
    </Stack>
  );
}
