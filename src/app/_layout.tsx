import { Stack } from 'expo-router';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/colors';
import { FocusAreasProvider } from '@/lib/focus-areas';

void SystemUI.setBackgroundColorAsync(colors.background);

const modal = {
  presentation: 'modal',
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
} as const;

export default function RootLayout() {
  return (
    <FocusAreasProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerUserInterfaceStyle: 'light',
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="new-task" options={modal} />
        <Stack.Screen name="new-goal" options={modal} />
        <Stack.Screen name="add-step" options={{ ...modal, sheetAllowedDetents: [0.6, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="queue" options={{ ...modal, sheetAllowedDetents: [0.6, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="goal/[id]" options={modal} />
        <Stack.Screen name="journal-edit" options={modal} />
      </Stack>
    </FocusAreasProvider>
  );
}
