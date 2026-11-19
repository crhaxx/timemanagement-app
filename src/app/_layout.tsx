import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { colors } from '@/constants/colors';
import { FocusAreasProvider } from '@/lib/focus-areas';
import {
  configureNotificationHandler,
  syncJournalReminderOnLaunch,
} from '@/lib/journal-reminders';
import { localDateISO } from '@/lib/dates';

void SystemUI.setBackgroundColorAsync(colors.background);
configureNotificationHandler();

const modal = {
  presentation: 'modal',
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
} as const;

function useJournalReminderObserver() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    void syncJournalReminderOnLaunch();

    function openJournal(notification: Notifications.Notification) {
      const url = notification.request.content.data?.url;
      if (url !== '/journal-edit') return;
      router.push({ pathname: '/journal-edit', params: { date: localDateISO() } });
      Notifications.clearLastNotificationResponse();
    }

    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) openJournal(last.notification);

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openJournal(response.notification);
    });

    return () => subscription.remove();
  }, []);
}

export default function RootLayout() {
  useJournalReminderObserver();

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
        <Stack.Screen name="new-routine" options={modal} />
        <Stack.Screen name="add-step" options={{ ...modal, sheetAllowedDetents: [0.6, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="queue" options={{ ...modal, sheetAllowedDetents: [0.6, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="inbox" options={{ ...modal, sheetAllowedDetents: [0.7, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="new-inbox" options={modal} />
        <Stack.Screen name="sleep-log" options={modal} />
        <Stack.Screen name="time-review" options={{ ...modal, sheetAllowedDetents: [0.7, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="time-summary" options={{ ...modal, sheetAllowedDetents: [0.7, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="goal/[id]" options={modal} />
        <Stack.Screen name="routine/[id]" options={modal} />
        <Stack.Screen name="journal-edit" options={modal} />
        <Stack.Screen name="settings" options={modal} />
      </Stack>
    </FocusAreasProvider>
  );
}
