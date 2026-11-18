import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EffortPicker } from '@/components/effort-picker';
import {
  Caption,
  Card,
  ChoiceGroup,
  ErrorBanner,
  Row,
  SheetHeader,
  ui,
} from '@/components/ui';
import { colors } from '@/constants/colors';
import { ROUTINE_FREQUENCY_LABELS, WEEKDAY_LABELS } from '@/constants/labels';
import { GOAL_COLUMNS } from '@/lib/data';
import { useFocusAreas } from '@/lib/focus-areas';
import { haptic } from '@/lib/haptics';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import {
  ROUTINE_FREQUENCIES,
  type Goal,
  type RoutineFrequency,
} from '@/types/database';

const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export default function NewRoutineSheet() {
  const { areas } = useFocusAreas();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [skipRule, setSkipRule] = useState('');
  const [frequency, setFrequency] = useState<RoutineFrequency>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([...ALL_WEEKDAYS]);
  const [duration, setDuration] = useState<number | null>(20);
  const [preferredTime, setPreferredTime] = useState('');
  const [focusAreaId, setFocusAreaId] = useState('');
  const [goalId, setGoalId] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    void supabase
      .from('goals')
      .select(GOAL_COLUMNS)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setGoals(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleDay(day: number) {
    setDaysOfWeek((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort((a, b) => a - b),
    );
  }

  async function save() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Pojmenuj rutinu.');
      return;
    }
    if ((frequency === 'weekly' || frequency === 'custom') && daysOfWeek.length === 0) {
      setError('Vyber aspoň jeden den.');
      return;
    }
    if (!supabase) {
      setError(supabaseConfigError);
      return;
    }

    const time = preferredTime.trim();
    const normalizedTime = time
      ? /^\d{1,2}:\d{2}$/.test(time)
        ? `${time.length === 4 ? `0${time}` : time}:00`
        : null
      : null;
    if (time && !normalizedTime) {
      setError('Čas zadej jako HH:MM, třeba 21:20.');
      return;
    }

    const days =
      frequency === 'daily'
        ? [...ALL_WEEKDAYS]
        : frequency === 'weekdays'
          ? [1, 2, 3, 4, 5]
          : frequency === 'monthly'
            ? null
            : daysOfWeek;

    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('routines').insert({
      title: trimmed,
      notes: notes.trim() || null,
      skip_rule: skipRule.trim() || null,
      frequency,
      days_of_week: days,
      duration_minutes: duration,
      preferred_time: normalizedTime,
      focus_area_id: focusAreaId || null,
      goal_id: goalId || null,
      status: 'active',
      updated_at: new Date().toISOString(),
    });
    setSaving(false);

    if (insertError) {
      haptic.error();
      setError(insertError.message);
      return;
    }

    haptic.success();
    router.back();
  }

  const needsWeekdays = frequency === 'weekly' || frequency === 'custom';

  return (
    <View style={ui.screen}>
      <SheetHeader
        title="Nová rutina"
        onCancel={() => router.back()}
        onSave={() => {
          void save();
        }}
        canSave={title.trim().length > 0}
        saving={saving}
      />
      <ScrollView
        contentContainerStyle={ui.sheetContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets>
        <Card clip>
          <View style={styles.titleBlock}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Co chceš opakovat?"
              placeholderTextColor={colors.muted}
              style={[ui.input, styles.titleInput]}
              autoFocus
            />
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Poznámka (volitelné)"
              placeholderTextColor={colors.muted}
              style={[ui.input, styles.notesInput]}
              multiline
            />
          </View>
        </Card>

        <ChoiceGroup
          label="Jak často"
          value={frequency}
          options={ROUTINE_FREQUENCIES.map((value) => ({
            value,
            label: ROUTINE_FREQUENCY_LABELS[value],
            color: colors.routine,
          }))}
          onChange={(value) => {
            setFrequency(value);
            if (value === 'daily') setDaysOfWeek([...ALL_WEEKDAYS]);
            if (value === 'weekdays') setDaysOfWeek([1, 2, 3, 4, 5]);
          }}
        />

        {needsWeekdays ? (
          <View style={styles.daysBlock}>
            <Text style={styles.groupLabel}>Dny v týdnu</Text>
            <View style={styles.days}>
              {ALL_WEEKDAYS.map((day) => {
                const selected = daysOfWeek.includes(day);
                return (
                  <Pressable
                    key={day}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      haptic.tap();
                      toggleDay(day);
                    }}
                    style={[styles.dayChip, selected && styles.dayChipSelected]}>
                    <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>
                      {WEEKDAY_LABELS[day]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.group}>
          <Text style={styles.groupLabel}>Odhad času</Text>
          <EffortPicker value={duration} onChange={setDuration} />
        </View>

        <Card clip>
          <Row>
            <Text style={ui.fieldLabel}>Preferovaný čas</Text>
            <TextInput
              value={preferredTime}
              onChangeText={setPreferredTime}
              placeholder="21:20"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
              style={[ui.input, styles.timeInput]}
            />
          </Row>
          <Row last>
            <Text style={ui.fieldLabel}>Kdy vynechat</Text>
            <TextInput
              value={skipRule}
              onChangeText={setSkipRule}
              placeholder="Např. po posilovně"
              placeholderTextColor={colors.muted}
              style={[ui.input, styles.skipInput]}
            />
          </Row>
        </Card>
        <Caption style={styles.hint}>
          Pravidlo pro vynechání je jen připomínka — přeskočení dne zapisuješ ručně.
        </Caption>

        {areas.length > 0 ? (
          <ChoiceGroup
            label="Oblast"
            value={focusAreaId}
            options={[
              { value: '', label: 'Bez oblasti' },
              ...areas.map((area) => ({
                value: area.id,
                label: area.name,
                color: area.color?.startsWith('#') ? area.color : colors.routine,
              })),
            ]}
            onChange={setFocusAreaId}
          />
        ) : null}

        {goals.length > 0 ? (
          <ChoiceGroup
            label="Vázané na cíl"
            value={goalId}
            options={[
              { value: '', label: 'Bez cíle' },
              ...goals.map((goal) => ({ value: goal.id, label: goal.title, color: colors.goal })),
            ]}
            onChange={setGoalId}
          />
        ) : null}

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  titleBlock: {
    padding: 16,
    gap: 12,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
  },
  notesInput: {
    minHeight: 56,
    textAlignVertical: 'top',
    color: colors.secondary,
  },
  group: {
    gap: 8,
  },
  groupLabel: {
    color: colors.secondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: 4,
  },
  daysBlock: {
    gap: 10,
  },
  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    minWidth: 42,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
  },
  dayChipSelected: {
    backgroundColor: colors.routine,
  },
  dayChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  dayChipTextSelected: {
    color: '#FFFFFF',
  },
  timeInput: {
    flex: 1,
    textAlign: 'right',
  },
  skipInput: {
    flex: 1,
    textAlign: 'right',
  },
  hint: {
    paddingHorizontal: 4,
    marginTop: -4,
  },
});
