import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RoutineFeelingSheet } from '@/components/routine-feeling-sheet';
import { Heatmap } from '@/components/routines/heatmap';
import { QuoteBlock } from '@/components/routines/quote-block';
import {
  RoutineForm,
  routineDraftValues,
  routineToDraft,
  type RoutineDraft,
} from '@/components/routines/routine-form';
import { SymbolIcon, type AppIconName } from '@/components/symbol-icon';
import {
  Caption,
  Card,
  ErrorBanner,
  Eyebrow,
  Pill,
  PressableScale,
  ROUNDED,
  Row,
  SheetHeader,
  TintIcon,
  ui,
} from '@/components/ui';
import { colors, onInk, palette } from '@/constants/colors';
import {
  formatMinutes,
  ROUTINE_LOG_STATUS_LABELS,
  ROUTINE_STATUS_LABELS,
} from '@/constants/labels';
import { confirmDestructive } from '@/lib/actions';
import {
  formatPreferredTime,
  GOAL_COLUMNS,
  isRoutineDueOn,
  ROUTINE_COLUMNS,
  routineScheduleLabel,
} from '@/lib/data';
import { daysUntil, formatJournalDate, localDateISO, shiftDate } from '@/lib/dates';
import { useFocusAreas } from '@/lib/focus-areas';
import { haptic } from '@/lib/haptics';
import {
  fetchRoutineLogsSince,
  indexLogsByDate,
  nextRoutineDate,
  routineBestStreak,
  routineCompletionRate,
  routineStartDate,
  routineStreak,
  writeRoutineLog,
} from '@/lib/routines';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { Goal, Routine, RoutineLog, RoutineLogStatus, RoutineStatus } from '@/types/database';

/** A year of logs: enough for the streaks, the record and the history grid. */
const HISTORY_DAYS = 365;
const RECENT_LOGS = 8;

const LOG_COLORS: Record<RoutineLogStatus, string> = {
  done: palette.green,
  skipped: palette.orange,
  missed: palette.gray,
};

export default function RoutineDetailSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = localDateISO();
  const since = shiftDate(today, 1 - HISTORY_DAYS);
  const { areas } = useFocusAreas();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  // Completions older than the loaded year, so the total stays exact.
  const [olderDone, setOlderDone] = useState(0);
  const [goals, setGoals] = useState<Goal[]>([]);
  // The edit form's state; `null` while the routine is only being viewed.
  const [draft, setDraft] = useState<RoutineDraft | null>(null);
  const [feelingOpen, setFeelingOpen] = useState(false);
  const [loading, setLoading] = useState(supabase !== null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  useEffect(() => {
    if (!supabase || !id) return;
    let cancelled = false;
    void Promise.all([
      supabase.from('routines').select(ROUTINE_COLUMNS).eq('id', id).maybeSingle(),
      fetchRoutineLogsSince(since, id),
      supabase.from('goals').select(GOAL_COLUMNS).eq('status', 'active').order('created_at', { ascending: true }),
      supabase
        .from('routine_logs')
        .select('id', { count: 'exact', head: true })
        .eq('routine_id', id)
        .eq('status', 'done'),
    ]).then(([routineResult, logResult, goalResult, countResult]) => {
      if (cancelled) return;
      const failure =
        routineResult.error?.message ??
        logResult.error ??
        goalResult.error?.message ??
        countResult.error?.message;
      if (failure) {
        setError(failure);
      } else if (!routineResult.data) {
        setError('Rutina už neexistuje.');
      } else {
        const loadedDone = logResult.data.filter((log) => log.status === 'done').length;
        setRoutine(routineResult.data);
        setLogs(logResult.data);
        setOlderDone(Math.max(0, (countResult.count ?? loadedDone) - loadedDone));
        setGoals(goalResult.data ?? []);
        setDraft(null);
        setError(null);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id, since]);

  const logIndex = useMemo(() => indexLogsByDate(logs), [logs]);
  const todayLog = logIndex.get(today) ?? null;

  const stats = useMemo(() => {
    if (!routine) return null;
    return {
      streak: routineStreak(routine, logIndex, today, since),
      best: routineBestStreak(routine, logIndex, today, since),
      rate: routineCompletionRate(routine, logIndex, today),
      total: olderDone + logs.filter((log) => log.status === 'done').length,
    };
  }, [routine, logIndex, logs, olderDone, today, since]);

  async function saveEdits() {
    if (!supabase || !routine || !draft) return;
    const result = routineDraftValues(draft);
    if (!result.values) {
      setError(result.error);
      return;
    }

    setSaving(true);
    setError(null);
    const next: Routine = { ...routine, ...result.values, updated_at: new Date().toISOString() };
    const { error: updateError } = await supabase
      .from('routines')
      .update({ ...result.values, updated_at: next.updated_at })
      .eq('id', routine.id);
    setSaving(false);
    if (updateError) {
      haptic.error();
      setError(updateError.message);
      return;
    }
    haptic.success();
    setRoutine(next);
    setDraft(null);
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
    if (!routine || (status === null && !todayLog)) return;
    const { log, error: writeError } = await writeRoutineLog({
      routineId: routine.id,
      date: today,
      existing: todayLog,
      status,
      note,
    });
    if (writeError) {
      haptic.error();
      setError(writeError);
      return;
    }
    setLogs((current) => {
      const without = current.filter((item) => item.log_date !== today);
      return log ? [log, ...without] : without;
    });
    setError(null);
    if (status === null) haptic.light();
    else haptic.success();
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

  if (loading) {
    return (
      <View style={ui.screen}>
        <SheetHeader title="Rutina" cancelLabel="Zavřít" onCancel={() => router.back()} />
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      </View>
    );
  }

  if (!routine || !stats) {
    return (
      <View style={ui.screen}>
        <SheetHeader title="Rutina" cancelLabel="Zavřít" onCancel={() => router.back()} />
        <View style={ui.sheetContent}>{error ? <ErrorBanner>{error}</ErrorBanner> : null}</View>
      </View>
    );
  }

  if (draft) {
    return (
      <View style={ui.screen}>
        <SheetHeader
          title="Upravit rutinu"
          cancelLabel="Zpět"
          onCancel={() => {
            setDraft(null);
            setError(null);
          }}
          onSave={() => {
            void saveEdits();
          }}
          canSave={draft.title.trim().length > 0}
          saving={saving}
        />
        <ScrollView
          contentContainerStyle={ui.sheetContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets>
          <RoutineForm
            draft={draft}
            goals={goals}
            onChange={(patch) => setDraft((current) => (current ? { ...current, ...patch } : current))}
          />
          {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        </ScrollView>
      </View>
    );
  }

  const active = routine.status === 'active';
  const dueToday = isRoutineDueOn(routine, today);
  const doneToday = todayLog?.status === 'done';
  const skippedToday = todayLog?.status === 'skipped';
  const next = active && !dueToday ? nextRoutineDate(routine, today) : null;
  const time = formatPreferredTime(routine.preferred_time);
  const area = areas.find((item) => item.id === routine.focus_area_id);
  const goal = goals.find((item) => item.id === routine.goal_id);
  const recent = logs.slice(0, RECENT_LOGS);
  // A broken run on a routine that has been around a while calls for a different push.
  const mood = doneToday ? 'done' : stats.streak === 0 && routineStartDate(routine) < today ? 'comeback' : 'start';
  const details: { icon: AppIconName; label: string; value: string }[] = [
    ...(routine.duration_minutes
      ? [{ icon: 'timer' as const, label: 'Délka', value: formatMinutes(routine.duration_minutes) }]
      : []),
    ...(time ? [{ icon: 'time' as const, label: 'Čas', value: time }] : []),
    ...(area ? [{ icon: 'area' as const, label: 'Oblast', value: area.name }] : []),
    ...(goal ? [{ icon: 'goal' as const, label: 'Cíl', value: goal.title }] : []),
  ];

  return (
    <View style={ui.screen}>
      <RoutineFeelingSheet
        visible={feelingOpen}
        routineTitle={routine.title}
        streak={stats.streak + 1}
        onClose={() => setFeelingOpen(false)}
        onSave={(note) => {
          setFeelingOpen(false);
          void setTodayStatus('done', note);
        }}
      />
      <SheetHeader
        title="Rutina"
        cancelLabel="Zavřít"
        onCancel={() => router.back()}
        saveLabel="Upravit"
        onSave={() => {
          haptic.light();
          setError(null);
          setDraft(routineToDraft(routine));
        }}
      />
      <ScrollView contentContainerStyle={ui.sheetContent}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.eyebrow} numberOfLines={1}>
              {routineScheduleLabel(routine)}
            </Text>
            {active ? null : (
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{ROUTINE_STATUS_LABELS[routine.status]}</Text>
              </View>
            )}
          </View>
          <Text style={styles.title} selectable>
            {routine.title}
          </Text>
          {routine.notes ? (
            <Text style={styles.notes} selectable>
              {routine.notes}
            </Text>
          ) : null}

          <View style={styles.stats}>
            <Stat value={String(stats.streak)} label="Série" flame={stats.streak > 0} />
            <View style={styles.statRule} />
            <Stat value={String(stats.best)} label="Rekord" />
            <View style={styles.statRule} />
            <Stat value={stats.rate === null ? '—' : `${Math.round(stats.rate * 100)} %`} label="30 dní" />
            <View style={styles.statRule} />
            <Stat value={String(stats.total)} label="Celkem" />
          </View>

          {active && dueToday ? (
            <View style={styles.actions}>
              {doneToday ? (
                <View style={[styles.cta, styles.ctaDone]} accessible accessibilityLabel="Dnes splněno">
                  <SymbolIcon name="checkmark" color={colors.inkText} size={16} weight="bold" />
                  <Text style={[styles.ctaText, styles.ctaTextDone]}>Dnes splněno</Text>
                </View>
              ) : (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Hotovo dnes"
                  onPress={() => {
                    haptic.light();
                    setFeelingOpen(true);
                  }}
                  pressedScale={0.98}
                  style={styles.cta}>
                  <SymbolIcon name="checkmark" color={colors.ink} size={16} weight="bold" />
                  <Text style={styles.ctaText}>Hotovo dnes</Text>
                </PressableScale>
              )}
              <Pressable
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => {
                  void setTodayStatus(doneToday || skippedToday ? null : 'skipped');
                }}
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                <Text style={styles.secondaryText}>
                  {doneToday ? 'Vrátit zpět' : skippedToday ? 'Přeskočeno · zrušit' : 'Přeskočit dnes'}
                </Text>
              </Pressable>
            </View>
          ) : next ? (
            <Text style={styles.heroNote}>
              Dnes volno. Další termín:{' '}
              {daysUntil(next) === 1 ? 'zítra' : formatJournalDate(next).toLocaleLowerCase('cs-CZ')}.
            </Text>
          ) : null}
        </View>

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        {active ? (
          <Card style={styles.block}>
            <QuoteBlock mood={mood} seed={`${today}:${routine.id}`} />
          </Card>
        ) : null}

        <Card style={styles.block}>
          <Eyebrow>Posledních 15 týdnů</Eyebrow>
          <Heatmap routine={routine} logs={logIndex} today={today} />
        </Card>

        {details.length > 0 || routine.skip_rule ? (
          <Card clip>
            {details.map((detail, index) => (
              <Row
                key={detail.label}
                last={index === details.length - 1 && !routine.skip_rule}
                inset={58}>
                <TintIcon name={detail.icon} color={colors.routine} size={30} />
                <Text style={styles.detailLabel}>{detail.label}</Text>
                <Text style={styles.detailValue} numberOfLines={2} selectable>
                  {detail.value}
                </Text>
              </Row>
            ))}
            {routine.skip_rule ? (
              // The rule is the user's own sentence, so it gets room to be read in full.
              <View style={styles.rule}>
                <TintIcon name="skip" color={colors.routine} size={30} />
                <View style={ui.flex}>
                  <Text style={styles.ruleLabel}>Kdy vynechat</Text>
                  <Text style={styles.ruleText} selectable>
                    {routine.skip_rule}
                  </Text>
                </View>
              </View>
            ) : null}
          </Card>
        ) : null}

        <Card clip>
          <View style={styles.blockHead}>
            <Eyebrow>Poslední zápisy</Eyebrow>
          </View>
          {recent.length === 0 ? (
            <Caption style={styles.empty}>Zatím žádný zápis. První den je ten nejtěžší.</Caption>
          ) : (
            recent.map((log, index) => (
              <Row key={log.id} last={index === recent.length - 1}>
                <View style={ui.flex}>
                  <Text style={styles.logDate}>{formatJournalDate(log.log_date)}</Text>
                  {log.note ? (
                    <Caption numberOfLines={3} style={styles.logNote} selectable>
                      {log.note}
                    </Caption>
                  ) : null}
                </View>
                <View>
                  <Pill label={ROUTINE_LOG_STATUS_LABELS[log.status]} color={LOG_COLORS[log.status]} />
                </View>
              </Row>
            ))
          )}
        </Card>

        <Card clip>
          {active ? (
            <ManageRow
              icon="pause"
              color={palette.orange}
              title="Pozastavit"
              disabled={saving}
              onPress={() => {
                void changeStatus('paused');
              }}
            />
          ) : (
            <ManageRow
              icon="play"
              color={colors.routine}
              title="Obnovit"
              disabled={saving}
              onPress={() => {
                void changeStatus('active');
              }}
            />
          )}
          {routine.status === 'ended' ? null : (
            <ManageRow
              icon="stop"
              color={palette.gray}
              title="Ukončit"
              disabled={saving}
              onPress={() => {
                void changeStatus('ended');
              }}
            />
          )}
          <ManageRow icon="trash" color={colors.danger} title="Smazat rutinu" destructive last onPress={confirmDelete} />
        </Card>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label, flame }: { value: string; label: string; flame?: boolean }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label} ${value}`}>
      <View style={styles.statValueRow}>
        {flame ? <SymbolIcon name="flame" color={onInk.orange} size={15} /> : null}
        <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      </View>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function ManageRow({
  icon,
  color,
  title,
  destructive,
  disabled,
  last,
  onPress,
}: {
  icon: AppIconName;
  color: string;
  title: string;
  destructive?: boolean;
  disabled?: boolean;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Row last={last} inset={58} onPress={disabled ? undefined : onPress} accessibilityLabel={title}>
      <TintIcon name={icon} color={color} size={30} />
      <Text style={[styles.manageTitle, destructive && { color: colors.danger }, disabled && styles.pressed]}>
        {title}
      </Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 48,
  },
  hero: {
    backgroundColor: colors.ink,
    borderRadius: 26,
    borderCurve: 'continuous',
    padding: 20,
    gap: 10,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 22,
  },
  eyebrow: {
    flex: 1,
    color: onInk.teal,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: colors.inkFill,
  },
  statusPillText: {
    color: colors.inkText,
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    color: colors.inkText,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  notes: {
    color: colors.inkSecondary,
    fontSize: 16,
    lineHeight: 22,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 16,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: onInk.separator,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  statRule: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: onInk.separator,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: colors.inkText,
    fontFamily: ROUNDED,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: colors.inkSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  actions: {
    gap: 6,
    marginTop: 8,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: colors.inkText,
  },
  ctaDone: {
    backgroundColor: onInk.green,
  },
  ctaText: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
  },
  ctaTextDone: {
    color: colors.inkText,
  },
  secondary: {
    alignSelf: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.inkSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  heroNote: {
    color: colors.inkSecondary,
    fontSize: 15,
    lineHeight: 20,
    marginTop: 6,
  },
  pressed: {
    opacity: 0.5,
  },
  block: {
    padding: 16,
    gap: 14,
  },
  blockHead: {
    paddingTop: 16,
    paddingBottom: 2,
    paddingHorizontal: 16,
  },
  empty: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  detailLabel: {
    color: colors.text,
    fontSize: 17,
  },
  detailValue: {
    flex: 1,
    color: colors.secondary,
    fontSize: 17,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ruleLabel: {
    color: colors.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  ruleText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  logDate: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  logNote: {
    marginTop: 2,
  },
  manageTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
  },
});
