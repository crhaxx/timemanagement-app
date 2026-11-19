import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  Caption,
  Card,
  ChoiceGroup,
  ErrorBanner,
  PrimaryButton,
  SheetHeader,
  TextButton,
  ui,
} from '@/components/ui';
import { colors } from '@/constants/colors';
import { QUALITY_LABELS } from '@/constants/labels';
import { SLEEP_COLUMNS } from '@/lib/data';
import { formatJournalDate, localDateISO } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import {
  bedtimeDateForWake,
  formatClock,
  formatSleepDuration,
  parseClockFromISO,
  wakeDateTime,
} from '@/lib/sleep';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import { SCALE_1_TO_5 } from '@/types/database';

export default function SleepLogSheet() {
  const params = useLocalSearchParams<{ date?: string }>();
  const wakeDate =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : localDateISO();

  const [entryId, setEntryId] = useState<string | null>(null);
  const [bedtime, setBedtime] = useState(() => bedtimeDateForWake(wakeDate, 23, 0));
  const [wakeTime, setWakeTime] = useState(() => wakeDateTime(wakeDate, 7, 0));
  const [quality, setQuality] = useState<number>(3);
  const [note, setNote] = useState('');
  const [journalEnergy, setJournalEnergy] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    void Promise.all([
      supabase.from('sleep_logs').select(SLEEP_COLUMNS).eq('wake_date', wakeDate).maybeSingle(),
      supabase.from('journal_entries').select('energy').eq('entry_date', wakeDate).maybeSingle(),
    ]).then(([sleep, journal]) => {
      if (cancelled) return;
      if (sleep.error) {
        setError(sleep.error.message);
        return;
      }
      if (sleep.data) {
        setEntryId(sleep.data.id);
        setBedtime(parseClockFromISO(sleep.data.bedtime, 23, 0));
        setWakeTime(parseClockFromISO(sleep.data.wake_time, 7, 0));
        if (sleep.data.quality) setQuality(sleep.data.quality);
        setNote(sleep.data.note ?? '');
      }
      setJournalEnergy(journal.data?.energy ?? null);
      setError(null);
    });
    return () => {
      cancelled = true;
    };
  }, [wakeDate]);

  const durationMinutes = useMemo(() => {
    const diff = Math.round((wakeTime.getTime() - bedtime.getTime()) / 60_000);
    return diff > 0 ? diff : null;
  }, [bedtime, wakeTime]);

  async function save() {
    if (!supabase) {
      setError(supabaseConfigError);
      return;
    }
    if (!durationMinutes) {
      setError('Vstávání musí být po usnutí.');
      return;
    }

    setSaving(true);
    setError(null);
    const payload = {
      wake_date: wakeDate,
      bedtime: bedtime.toISOString(),
      wake_time: wakeTime.toISOString(),
      quality,
      note: note.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error: upsertError } = await supabase
      .from('sleep_logs')
      .upsert(payload, { onConflict: 'wake_date' })
      .select(SLEEP_COLUMNS)
      .single();
    setSaving(false);

    if (upsertError) {
      haptic.error();
      setError(upsertError.message);
      return;
    }

    haptic.success();
    router.back();
  }

  function openAndroidPicker(which: 'bed' | 'wake') {
    const value = which === 'bed' ? bedtime : wakeTime;
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      is24Hour: true,
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        if (which === 'bed') {
          setBedtime(bedtimeDateForWake(wakeDate, date.getHours(), date.getMinutes()));
        } else {
          setWakeTime(wakeDateTime(wakeDate, date.getHours(), date.getMinutes()));
        }
      },
    });
  }

  return (
    <View style={ui.screen}>
      <SheetHeader
        title="Spánek"
        onCancel={() => router.back()}
        onSave={() => {
          void save();
        }}
        canSave={durationMinutes !== null}
        saving={saving}
      />
      <ScrollView
        contentContainerStyle={ui.sheetContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets>
        <Caption>{formatJournalDate(wakeDate)}</Caption>

        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={ui.fieldLabel}>Usnul</Text>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={bedtime}
                mode="time"
                display="compact"
                locale="cs-CZ"
                onChange={(_event, date) => {
                  if (!date) return;
                  setBedtime(bedtimeDateForWake(wakeDate, date.getHours(), date.getMinutes()));
                }}
              />
            ) : (
              <TextButton title={formatClock(bedtime)} onPress={() => openAndroidPicker('bed')} />
            )}
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Text style={ui.fieldLabel}>Vstal</Text>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={wakeTime}
                mode="time"
                display="compact"
                locale="cs-CZ"
                onChange={(_event, date) => {
                  if (!date) return;
                  setWakeTime(wakeDateTime(wakeDate, date.getHours(), date.getMinutes()));
                }}
              />
            ) : (
              <TextButton title={formatClock(wakeTime)} onPress={() => openAndroidPicker('wake')} />
            )}
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Text style={ui.fieldLabel}>Délka</Text>
            <Text style={styles.value}>
              {formatSleepDuration(durationMinutes) ?? '—'}
            </Text>
          </View>
        </Card>

        <ChoiceGroup
          label="Jak ses vyspal"
          options={SCALE_1_TO_5.map((value) => ({
            value,
            label: `${value} · ${QUALITY_LABELS[value]}`,
            color: colors.sleep,
          }))}
          value={quality}
          onChange={setQuality}
        />

        {journalEnergy ? (
          <Card style={styles.compare}>
            <Text style={ui.title}>Spánek × energie</Text>
            <Caption>
              {formatSleepDuration(durationMinutes) ?? '—'} spánku · energie z deníku {journalEnergy}/5
              {durationMinutes && durationMinutes < 6 * 60 && journalEnergy <= 2
                ? ' — krátký spánek sedí s nízkou energií.'
                : durationMinutes && durationMinutes >= 7 * 60 && journalEnergy >= 4
                  ? ' — dobrý spánek a energie jdou spolu.'
                  : '.'}
            </Caption>
          </Card>
        ) : null}

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Poznámka (volitelně)"
          placeholderTextColor={colors.muted}
          style={styles.note}
          multiline
        />

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        <PrimaryButton
          title={entryId ? 'Uložit spánek' : 'Zapsat spánek'}
          color={colors.sleep}
          loading={saving}
          disabled={durationMinutes === null}
          onPress={() => {
            void save();
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
  },
  value: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  compare: {
    padding: 16,
    gap: 6,
  },
  note: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 24,
    minHeight: 80,
    paddingHorizontal: 4,
  },
});
