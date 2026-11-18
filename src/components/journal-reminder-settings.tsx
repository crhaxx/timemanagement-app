import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';

import {
  Card,
  Caption,
  ErrorBanner,
  Row,
  SectionHeader,
  TextButton,
  TintIcon,
  ui,
} from '@/components/ui';
import { colors, palette } from '@/constants/colors';
import { haptic } from '@/lib/haptics';
import {
  formatReminderTime,
  loadReminderSettings,
  setJournalReminderEnabled,
  setJournalReminderTime,
  type JournalReminderSettings as ReminderSettings,
} from '@/lib/journal-reminders';

function reminderDate(hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

export function JournalReminderSettings() {
  const [reminder, setReminder] = useState<ReminderSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') {
        setReminder(null);
        return;
      }
      void loadReminderSettings().then(setReminder);
    }, []),
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.section}>
        <SectionHeader title="Notifikace" />
        <Card style={styles.card}>
          <Caption>Připomínky deníku fungují jen v mobilní aplikaci.</Caption>
        </Card>
      </View>
    );
  }

  if (!reminder) return null;

  const settings = reminder;

  async function toggle(enabled: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);
    haptic.tap();
    const next = await setJournalReminderEnabled(enabled);
    setReminder(next);
    setBusy(false);
    if (enabled && !next.enabled) {
      setError('Povol notifikace v nastavení telefonu, ať tě večer upozorníme na deník.');
    }
  }

  async function changeTime(date: Date) {
    setBusy(true);
    setError(null);
    haptic.tap();
    const next = await setJournalReminderTime(date.getHours(), date.getMinutes());
    setReminder(next);
    setBusy(false);
  }

  function openAndroidTimePicker() {
    DateTimePickerAndroid.open({
      value: reminderDate(settings.hour, settings.minute),
      mode: 'time',
      is24Hour: true,
      onChange: (event, date) => {
        if (event.type === 'set' && date) void changeTime(date);
      },
    });
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Notifikace" />
      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      <Card style={styles.card} clip>
        <View style={styles.head}>
          <TintIcon name="bell" color={palette.orange} size={36} />
          <View style={ui.flex}>
            <Text style={ui.title}>Večerní připomínka</Text>
            <Caption>Každý den ti připomeneme zapsat deník.</Caption>
          </View>
          <Switch
            value={settings.enabled}
            disabled={busy}
            onValueChange={(value) => void toggle(value)}
            trackColor={{ false: colors.fillStrong, true: colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
        {settings.enabled ? (
          <Row last inset={16}>
            <Text style={ui.fieldLabel}>Čas</Text>
            <View style={styles.time}>
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={reminderDate(settings.hour, settings.minute)}
                  mode="time"
                  display="compact"
                  locale="cs-CZ"
                  disabled={busy}
                  onChange={(_event, date) => {
                    if (date) void changeTime(date);
                  }}
                />
              ) : (
                <TextButton
                  title={formatReminderTime(settings.hour, settings.minute)}
                  onPress={openAndroidTimePicker}
                />
              )}
            </View>
          </Row>
        ) : null}
      </Card>
      <Caption style={styles.hint}>
        {settings.enabled
          ? `Připomínka přijde každý den v ${formatReminderTime(settings.hour, settings.minute)}.`
          : 'Zapni připomínku, pokud chceš večer upozornění na zápis.'}
      </Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  card: {
    paddingTop: 16,
    paddingBottom: 4,
    gap: 4,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  time: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  hint: {
    paddingHorizontal: 4,
  },
});
