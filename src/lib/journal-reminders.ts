import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  AndroidImportance,
  IosAuthorizationStatus,
  SchedulableTriggerInputTypes,
  type NotificationPermissionsStatus,
} from 'expo-notifications';
import { Platform } from 'react-native';

const STORAGE_KEY = 'journal-reminder-settings';
const NOTIFICATION_ID = 'journal-evening-reminder';
const CHANNEL_ID = 'journal-reminders';

/** Default evening reminder: 20:00 local time. */
export const DEFAULT_REMINDER_HOUR = 20;
export const DEFAULT_REMINDER_MINUTE = 0;

export type JournalReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
};

const defaults: JournalReminderSettings = {
  enabled: false,
  hour: DEFAULT_REMINDER_HOUR,
  minute: DEFAULT_REMINDER_MINUTE,
};

let handlerConfigured = false;

export function configureNotificationHandler() {
  if (handlerConfigured || Platform.OS === 'web') return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function supportsReminders() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function isPermissionGranted(permission: NotificationPermissionsStatus) {
  return permission.granted || permission.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}

export async function loadReminderSettings(): Promise<JournalReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<JournalReminderSettings>;
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : defaults.enabled,
      hour:
        typeof parsed.hour === 'number' && parsed.hour >= 0 && parsed.hour <= 23
          ? parsed.hour
          : defaults.hour,
      minute:
        typeof parsed.minute === 'number' && parsed.minute >= 0 && parsed.minute <= 59
          ? parsed.minute
          : defaults.minute,
    };
  } catch {
    return defaults;
  }
}

async function saveReminderSettings(settings: JournalReminderSettings) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Připomínky deníku',
    importance: AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function requestReminderPermissions() {
  if (!supportsReminders()) return false;
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (isPermissionGranted(current)) return true;
  const next = await Notifications.requestPermissionsAsync();
  return isPermissionGranted(next);
}

async function cancelReminderNotification() {
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
}

async function scheduleReminderNotification(hour: number, minute: number) {
  await cancelReminderNotification();
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: 'Čas na deník',
      body: 'Napiš pár vět, jaký dnešek byl.',
      data: { url: '/journal-edit' },
      sound: 'default',
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: CHANNEL_ID,
    },
  });
}

export async function setJournalReminderEnabled(enabled: boolean) {
  const settings = await loadReminderSettings();
  if (!enabled) {
    if (supportsReminders()) await cancelReminderNotification();
    const next = { ...settings, enabled: false };
    await saveReminderSettings(next);
    return next;
  }

  if (!supportsReminders()) {
    const next = { ...settings, enabled: false };
    await saveReminderSettings(next);
    return next;
  }

  const granted = await requestReminderPermissions();
  if (!granted) {
    await cancelReminderNotification();
    const next = { ...settings, enabled: false };
    await saveReminderSettings(next);
    return next;
  }

  await scheduleReminderNotification(settings.hour, settings.minute);
  const next = { ...settings, enabled: true };
  await saveReminderSettings(next);
  return next;
}

export async function setJournalReminderTime(hour: number, minute: number) {
  const settings = await loadReminderSettings();
  const next = { ...settings, hour, minute };
  await saveReminderSettings(next);
  if (next.enabled && supportsReminders()) {
    const granted = await requestReminderPermissions();
    if (granted) {
      await scheduleReminderNotification(hour, minute);
    } else {
      next.enabled = false;
      await saveReminderSettings(next);
    }
  }
  return next;
}

/**
 * Re-apply a stored reminder after reboot without prompting for permission.
 * Permission prompts happen from the journal toggle / ensure call instead.
 */
export async function syncJournalReminderOnLaunch() {
  if (!supportsReminders()) return;
  configureNotificationHandler();
  const settings = await loadReminderSettings();
  if (!settings.enabled) {
    await cancelReminderNotification();
    return;
  }
  await ensureAndroidChannel();
  const permission = await Notifications.getPermissionsAsync();
  if (!isPermissionGranted(permission)) return;
  await scheduleReminderNotification(settings.hour, settings.minute);
}

export function formatReminderTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
