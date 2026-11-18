import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EffortPicker } from '@/components/effort-picker';
import { RoutineFeelingSheet } from '@/components/routine-feeling-sheet';
import {
  Caption,
  Card,
  ChoiceGroup,
  ErrorBanner,
  Pill,
  PrimaryButton,
  Row,
  SheetHeader,
  TextButton,
  ui,
} from '@/components/ui';
import { colors, palette } from '@/constants/colors';
import {
  formatMinutes,
  ROUTINE_FREQUENCY_LABELS,
  ROUTINE_LOG_STATUS_LABELS,
  ROUTINE_STATUS_LABELS,
  WEEKDAY_LABELS,
} from '@/constants/labels';
import { confirmDestructive } from '@/lib/actions';
import {
  formatPreferredTime,
  GOAL_COLUMNS,
  isRoutineDueOn,
  ROUTINE_COLUMNS,
  ROUTINE_LOG_COLUMNS,
  routineScheduleLabel,
} from '@/lib/data';
import { formatJournalDate, localDateISO, shiftDate } from '@/lib/dates';
import { useFocusAreas } from '@/lib/focus-areas';
import { haptic } from '@/lib/haptics';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import {
  ROUTINE_FREQUENCIES,
  ROUTINE_STATUSES,
  type Goal,
  type Routine,
  type RoutineFrequency,
  type RoutineLog,
  type RoutineLogStatus,
  type RoutineStatus,
} from '@/types/database';

const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export default function RoutineDetailSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = localDateISO();
  const { areas } = useFocusAreas();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [skipRule, setSkipRule] = useState('');
  const [frequency, setFrequency] = useState<RoutineFrequency>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([...ALL_WEEKDAYS]);
  const [duration, setDuration] = useState<number | null>(null);
  const [preferredTime, setPreferredTime] = useState('');
  const [focusAreaId, setFocusAreaId] = useState('');
  const [goalId, setGoalId] = useState('');
  const [editing, setEditing] = useState(false);
  const [feelingOpen, setFeelingOpen] = useState(false);
  const [loading, setLoading] = useState(supabase !== null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  function fill(loaded: Routine) {
    setTitle(loaded.title);
    setNotes(loaded.notes ?? '');
    setSkipRule(loaded.skip_rule ?? '');
    setFrequency(loaded.frequency);
    setDaysOfWeek(loaded.days_of_week?.length ? [...loaded.days_of_week] : [...ALL_WEEKDAYS]);
    setDuration(loaded.duration_minutes);
    setPreferredTime(formatPreferredTime(loaded.preferred_time) ?? '');
    setFocusAreaId(loaded.focus_area_id ?? '');
    setGoalId(loaded.goal_id ?? '');
  }

  useEffect(() => {
    if (!supabase || !id) return;
    let cancelled = false;
    const since = shiftDate(today, -13);
    void Promise.all([
      supabase.from('routines').select(ROUTINE_COLUMNS).eq('id', id).maybeSingle(),
      supabase
        .from('routine_logs')
        .select(ROUTINE_LOG_COLUMNS)
        .eq('routine_id', id)
        .gte('log_date', since)
        .order('log_date', { ascending: false }),
      supabase.from('goals').select(GOAL_COLUMNS).eq('status', 'active').order('created_at', { ascending: true }),
    ]).then(([routineResult, logResult, goalResult]) => {
      if (cancelled) return;
      const queryError = routineResult.error ?? logResult.error ?? goalResult.error;
      if (queryError) {
        setError(queryError.message);
      } else if (!routineResult.data) {
        setError('Rutina už neexistuje.');
      } else {
        setRoutine(routineResult.data);
        fill(routineResult.data);
        setLogs(logResult.data ?? []);
        setGoals(goalResult.data ?? []);
        setEditing(false);
        setError(null);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id, today]);

  const todayLog = useMemo(
    () => logs.find((log) => log.log_date === today) ?? null,
    [logs, today],
  );

  const recent = useMemo(() => {
    const byDate = new Map(logs.map((log) => [log.log_date, log]));
    return Array.from({ length: 14 }, (_, index) => {
      const date = shiftDate(today, -index);
      return { date, log: byDate.get(date) ?? null };
    });
  }, [logs, today]);

  function toggleDay(day: number) {
    setDaysOfWeek((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort((a, b) => a - b),
    );
  }

  function cancelEdit() {
    if (routine) fill(routine);
    setEditing(false);
    setError(null);
  }

  function parseTime(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^\d{1,2}:\d{2}$/.test(trimmed)) return undefined;
    return `${trimmed.length === 4 ? `0${trimmed}` : trimmed}:00`;
  }

  async function saveEdits() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Pojmenuj rutinu.');
      return;
    }
    if ((frequency === 'weekly' || frequency === 'custom') && daysOfWeek.length === 0) {
      setError('Vyber aspoň jeden den.');
      return;
    }
    if (!supabase || !routine) return;

    const normalizedTime = parseTime(preferredTime);
    if (normalizedTime === undefined) {
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
    const next: Routine = {
      ...routine,
      title: trimmed,
      notes: notes.trim() || null,
      skip_rule: skipRule.trim() || null,
      frequency,
      days_of_week: days,
      duration_minutes: duration,
      preferred_time: normalizedTime,
      focus_area_id: focusAreaId || null,
      goal_id: goalId || null,
      updated_at: new Date().toISOString(),
    };
    const { error: updateError } = await supabase
      .from('routines')
      .update({
        title: next.title,
        notes: next.notes,
        skip_rule: next.skip_rule,
        frequency: next.frequency,
        days_of_week: next.days_of_week,
        duration_minutes: next.duration_minutes,
        preferred_time: next.preferred_time,
        focus_area_id: next.focus_area_id,
        goal_id: next.goal_id,
        updated_at: next.updated_at,
      })
      .eq('id', routine.id);
    setSaving(false);
    if (updateError) {
      haptic.error();
      setError(updateError.message);
      return;
    }
    haptic.success();
    setRoutine(next);
    fill(next);
    setEditing(false);
  }

  async function changeStatus(status: RoutineStatus) {
    if (!supabase || !routine) return;
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from('routines')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', routine.id);
    setSaving(false);
    if (updateError) {
      haptic.error();
      setError(updateError.message);
      return;
    }
    haptic.success();
    router.back();
  }

  async function setTodayStatus(status: RoutineLogStatus | null, note?: string | null) {
    if (!supabase || !routine) return;

    if (status === null) {
      if (!todayLog) return;
      const { error: deleteError } = await supabase.from('routine_logs').delete().eq('id', todayLog.id);
      if (deleteError) {
        haptic.error();
        setError(deleteError.message);
        return;
      }
      setLogs((current) => current.filter((log) => log.id !== todayLog.id));
      haptic.light();
      return;
    }

    const payload = {
      routine_id: routine.id,
      log_date: today,
      status,
      note: note !== undefined ? note : (todayLog?.note ?? null),
    };

    const result = todayLog
      ? await supabase
          .from('routine_logs')
          .update({ status: payload.status, note: payload.note })
          .eq('id', todayLog.id)
          .select(ROUTINE_LOG_COLUMNS)
          .single()
      : await supabase.from('routine_logs').insert(payload).select(ROUTINE_LOG_COLUMNS).single();

    if (result.error) {
      haptic.error();
      setError(result.error.message);
      return;
    }

    setLogs((current) => {
      const without = current.filter((log) => log.log_date !== today);
      return result.data ? [result.data, ...without] : without;
    });
    haptic.success();
  }

  function confirmDelete() {
    if (!routine) return;
    confirmDestructive(
      'Smazat rutinu',
      `Opravdu smazat „${routine.title}“? Smažou se i všechny zápisy.`,
      'Smazat',
      () => {
        void (async () => {
          if (!supabase) return;
          const { error: deleteError } = await supabase.from('routines').delete().eq('id', routine.id);
          if (deleteError) {
            setError(deleteError.message);
            return;
          }
          haptic.warning();
          router.back();
        })();
      },
    );
  }

  function toggleDoneToday() {
    if (todayLog?.status === 'done') {
      void setTodayStatus(null);
      return;
    }
    setFeelingOpen(true);
  }

  if (loading) {
    return (
      <View style={ui.screen}>
        <SheetHeader title="Rutina" onCancel={() => router.back()} />
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      </View>
    );
  }

  if (!routine) {
    return (
      <View style={ui.screen}>
        <SheetHeader title="Rutina" onCancel={() => router.back()} />
        <View style={ui.sheetContent}>{error ? <ErrorBanner>{error}</ErrorBanner> : null}</View>
      </View>
    );
  }

  const dueToday = isRoutineDueOn(routine, today);
  const needsWeekdays = frequency === 'weekly' || frequency === 'custom';

  return (
    <View style={ui.screen}>
      <RoutineFeelingSheet
        visible={feelingOpen}
        routineTitle={routine.title}
        onClose={() => setFeelingOpen(false)}
        onSave={(note) => {
          setFeelingOpen(false);
          void setTodayStatus('done', note);
        }}
      />
      <SheetHeader
        title={editing ? 'Upravit rutinu' : 'Rutina'}
        cancelLabel={editing ? 'Zpět' : 'Zavřít'}
        onCancel={() => (editing ? cancelEdit() : router.back())}
        onSave={
          editing
            ? () => {
                void saveEdits();
              }
            : undefined
        }
        saveLabel="Uložit"
        canSave={title.trim().length > 0}
        saving={saving}
      />
      <ScrollView
        contentContainerStyle={ui.sheetContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets>
        {editing ? (
          <>
            <Card clip>
              <View style={styles.titleBlock}>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Název"
                  placeholderTextColor={colors.muted}
                  style={[ui.input, styles.titleInput]}
                />
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Poznámka"
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
              onChange={setFrequency}
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
                  placeholder="Volitelné"
                  placeholderTextColor={colors.muted}
                  style={[ui.input, styles.skipInput]}
                />
              </Row>
            </Card>

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
          </>
        ) : (
          <>
            <Card style={styles.summary}>
              <View style={styles.summaryTop}>
                <View style={ui.flex}>
                  <Text style={styles.summaryTitle}>{routine.title}</Text>
                  <Caption>{routineScheduleLabel(routine)}</Caption>
                </View>
                <Pill
                  label={ROUTINE_STATUS_LABELS[routine.status]}
                  color={
                    routine.status === 'active'
                      ? colors.routine
                      : routine.status === 'paused'
                        ? palette.orange
                        : palette.gray
                  }
                />
              </View>
              {routine.notes ? <Text style={styles.notes}>{routine.notes}</Text> : null}
              <View style={styles.metaRow}>
                {routine.duration_minutes ? (
                  <Pill label={formatMinutes(routine.duration_minutes)} color={colors.routine} />
                ) : null}
                {formatPreferredTime(routine.preferred_time) ? (
                  <Pill label={formatPreferredTime(routine.preferred_time)!} color={palette.indigo} />
                ) : null}
              </View>
              {routine.skip_rule ? <Caption>Vynechat: {routine.skip_rule}</Caption> : null}
            </Card>

            {routine.status === 'active' && dueToday ? (
              <View style={styles.todayActions}>
                <PrimaryButton
                  title={todayLog?.status === 'done' ? 'Zrušit dnešní hotovo' : 'Označit dnešek'}
                  color={todayLog?.status === 'done' ? palette.green : colors.routine}
                  onPress={toggleDoneToday}
                />
                <View style={styles.todayAlt}>
                  <TextButton
                    title={todayLog?.status === 'skipped' ? 'Zrušit přeskočení' : 'Přeskočit'}
                    onPress={() => {
                      void setTodayStatus(todayLog?.status === 'skipped' ? null : 'skipped');
                    }}
                  />
                  {todayLog && todayLog.status !== 'done' && todayLog.status !== 'skipped' ? (
                    <Caption>Dnes: {ROUTINE_LOG_STATUS_LABELS[todayLog.status]}</Caption>
                  ) : null}
                </View>
              </View>
            ) : null}

            <Card clip>
              <SectionLabel title="Posledních 14 dní" />
              {recent.map(({ date, log }, index) => (
                <Row key={date} last={index === recent.length - 1}>
                  <View style={ui.flex}>
                    <Text style={styles.historyDate}>{formatJournalDate(date)}</Text>
                    {log?.note ? (
                      <Caption numberOfLines={2} style={styles.historyNote}>
                        {log.note}
                      </Caption>
                    ) : null}
                  </View>
                  {log ? (
                    <Pill
                      label={ROUTINE_LOG_STATUS_LABELS[log.status]}
                      color={
                        log.status === 'done'
                          ? palette.green
                          : log.status === 'skipped'
                            ? palette.orange
                            : palette.gray
                      }
                    />
                  ) : (
                    <Text style={styles.historyEmpty}>—</Text>
                  )}
                </Row>
              ))}
            </Card>

            <TextButton title="Upravit" onPress={() => setEditing(true)} />

            <ChoiceGroup
              label="Stav"
              value={routine.status}
              options={ROUTINE_STATUSES.map((value) => ({
                value,
                label: ROUTINE_STATUS_LABELS[value],
                color:
                  value === 'active' ? colors.routine : value === 'paused' ? palette.orange : palette.gray,
              }))}
              onChange={(status) => {
                void changeStatus(status);
              }}
            />

            <TextButton title="Smazat rutinu" color={colors.danger} onPress={confirmDelete} />
          </>
        )}

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      </ScrollView>
    </View>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.groupLabel}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 48,
  },
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
  todayActions: {
    gap: 8,
  },
  todayAlt: {
    alignItems: 'center',
    gap: 4,
  },
  summary: {
    padding: 16,
    gap: 12,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  notes: {
    color: colors.secondary,
    fontSize: 15,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionLabel: {
    paddingTop: 14,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  historyDate: {
    color: colors.text,
    fontSize: 15,
  },
  historyNote: {
    marginTop: 2,
  },
  historyEmpty: {
    color: colors.tertiary,
    fontSize: 15,
  },
});
