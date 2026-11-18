import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { RoutineFeelingSheet } from '@/components/routine-feeling-sheet';
import { QuoteBlock } from '@/components/routines/quote-block';
import { RoutineCard } from '@/components/routines/routine-card';
import { TodayHero } from '@/components/routines/today-hero';
import { SymbolIcon } from '@/components/symbol-icon';
import {
  Card,
  Caption,
  EmptyState,
  ErrorBanner,
  Pill,
  Row,
  SectionHeader,
  TintIcon,
  ui,
} from '@/components/ui';
import { colors, palette } from '@/constants/colors';
import { ROUTINE_STATUS_LABELS } from '@/constants/labels';
import { showActions } from '@/lib/actions';
import { isRoutineDueOn, ROUTINE_COLUMNS, routineScheduleLabel } from '@/lib/data';
import { daysUntil, formatTaskWhen, localDateISO, shiftDate, weekdayShort } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import {
  daySummary,
  fetchRoutineLogsSince,
  indexLogsByRoutine,
  nextRoutineDate,
  perfectDayStreak,
  routineDayState,
  routineStreak,
  writeRoutineLog,
} from '@/lib/routines';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { Routine, RoutineLog, RoutineLogStatus } from '@/types/database';

/** How far back logs are loaded; streaks on this screen are counted within it. */
const HISTORY_DAYS = 120;
const WEEK = [6, 5, 4, 3, 2, 1, 0];

function nextLabel(date: string) {
  const days = daysUntil(date);
  if (days === 1) return 'Zítra';
  return days < 7 ? weekdayShort(date) : formatTaskWhen(date);
}

export default function RoutinesScreen() {
  const today = localDateISO();
  const since = shiftDate(today, 1 - HISTORY_DAYS);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [feelingRoutine, setFeelingRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(supabase !== null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  const load = useCallback(async () => {
    if (!supabase) return;
    const [routineRows, logRows] = await Promise.all([
      supabase.from('routines').select(ROUTINE_COLUMNS).order('created_at', { ascending: true }),
      fetchRoutineLogsSince(since),
    ]);
    const failure = routineRows.error?.message ?? logRows.error;
    if (failure) {
      setError(failure);
    } else {
      setRoutines(routineRows.data ?? []);
      setLogs(logRows.data);
      setError(null);
    }
    setLoading(false);
    setRefreshing(false);
  }, [since]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const logsByRoutine = useMemo(() => indexLogsByRoutine(logs), [logs]);

  const { active, dueToday, otherActive, archived } = useMemo(() => {
    const activeRoutines = routines.filter((routine) => routine.status === 'active');
    return {
      active: activeRoutines,
      // Timed routines in the order of the day, the rest after them.
      dueToday: activeRoutines
        .filter((routine) => isRoutineDueOn(routine, today))
        .sort((a, b) => (a.preferred_time ?? '99').localeCompare(b.preferred_time ?? '99')),
      otherActive: activeRoutines.filter((routine) => !isRoutineDueOn(routine, today)),
      archived: routines.filter((routine) => routine.status !== 'active'),
    };
  }, [routines, today]);

  const week = useMemo(
    () => WEEK.map((ago) => daySummary(active, logsByRoutine, shiftDate(today, -ago), today)),
    [active, logsByRoutine, today],
  );

  const dayStreak = useMemo(
    () => perfectDayStreak(active, logsByRoutine, today, since),
    [active, logsByRoutine, today, since],
  );

  function statusToday(routine: Routine) {
    return logsByRoutine.get(routine.id)?.get(today)?.status ?? null;
  }

  async function setTodayStatus(routine: Routine, status: RoutineLogStatus | null, note?: string | null) {
    const existing = logsByRoutine.get(routine.id)?.get(today) ?? null;
    if (status === null && !existing) return;

    const { log, error: writeError } = await writeRoutineLog({
      routineId: routine.id,
      date: today,
      existing,
      status,
      note,
    });
    if (writeError) {
      haptic.error();
      setError(writeError);
      return;
    }

    setLogs((current) => {
      const without = current.filter(
        (item) => !(item.routine_id === routine.id && item.log_date === today),
      );
      return log ? [log, ...without] : without;
    });
    setError(null);
    if (status === null) haptic.light();
    else haptic.success();
  }

  function openRoutine(routine: Routine) {
    haptic.light();
    router.push({ pathname: '/routine/[id]', params: { id: routine.id } });
  }

  function toggleDone(routine: Routine) {
    if (statusToday(routine) === 'done') {
      void setTodayStatus(routine, null);
      return;
    }
    haptic.light();
    setFeelingRoutine(routine);
  }

  function promptSkip(routine: Routine) {
    const current = statusToday(routine);
    haptic.light();
    showActions(routine.title, [
      {
        label: current === 'done' ? 'Zrušit hotovo' : 'Hotovo',
        onPress: () => toggleDone(routine),
      },
      {
        label: current === 'skipped' ? 'Zrušit přeskočení' : 'Přeskočit dnes',
        onPress: () => {
          void setTodayStatus(routine, current === 'skipped' ? null : 'skipped');
        },
      },
    ]);
  }

  return (
    <>
      <RoutineFeelingSheet
        visible={feelingRoutine !== null}
        routineTitle={feelingRoutine?.title ?? ''}
        streak={
          feelingRoutine
            ? routineStreak(feelingRoutine, logsByRoutine.get(feelingRoutine.id), today, since) + 1
            : undefined
        }
        onClose={() => setFeelingRoutine(null)}
        onSave={(note) => {
          if (!feelingRoutine) return;
          const routine = feelingRoutine;
          setFeelingRoutine(null);
          void setTodayStatus(routine, 'done', note);
        }}
      />
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nová rutina"
              hitSlop={12}
              onPress={() => {
                haptic.light();
                router.push('/new-routine');
              }}
              style={({ pressed }) => pressed && styles.pressed}>
              <SymbolIcon name="addCircle" color={colors.accent} size={26} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={ui.screen}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={ui.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.muted}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }>
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        {loading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : routines.length === 0 ? (
          <>
            <EmptyState
              icon="routine"
              color={colors.routine}
              title="Co chceš opakovat?"
              message="Rutiny jsou malé návyky, které chceš dělat pravidelně — cvičení, čtení, úklid."
              actionTitle="Přidat první rutinu"
              onAction={() => router.push('/new-routine')}
            />
            <Card style={styles.quoteCard}>
              <QuoteBlock mood="build" seed={today} />
            </Card>
          </>
        ) : (
          <>
            {active.length > 0 ? (
              <TodayHero
                today={today}
                streak={dayStreak}
                week={week}
                items={dueToday.map((routine) => ({
                  id: routine.id,
                  status: statusToday(routine),
                  minutes: routine.duration_minutes,
                }))}
              />
            ) : null}

            {dueToday.length > 0 ? (
              <View style={styles.cards}>
                {dueToday.map((routine) => {
                  const routineLogs = logsByRoutine.get(routine.id);
                  const streak = routineStreak(routine, routineLogs, today, since);
                  return (
                    <RoutineCard
                      key={routine.id}
                      routine={routine}
                      status={statusToday(routine)}
                      streak={streak}
                      streakCapped={streak >= HISTORY_DAYS - 1}
                      days={WEEK.map((ago) =>
                        routineDayState(routine, routineLogs, shiftDate(today, -ago), today),
                      )}
                      onPress={() => openRoutine(routine)}
                      onToggle={() => toggleDone(routine)}
                      onLongPress={() => promptSkip(routine)}
                    />
                  );
                })}
              </View>
            ) : null}

            {otherActive.length > 0 ? (
              <>
                <SectionHeader title="Jindy" />
                <Card clip>
                  {otherActive.map((routine, index) => {
                    const next = nextRoutineDate(routine, today);
                    return (
                      <Row
                        key={routine.id}
                        last={index === otherActive.length - 1}
                        inset={64}
                        onPress={() => openRoutine(routine)}
                        accessibilityLabel={routine.title}>
                        <TintIcon name="routine" color={colors.routine} />
                        <View style={ui.flex}>
                          <Text style={ui.title} numberOfLines={1}>
                            {routine.title}
                          </Text>
                          <Caption numberOfLines={1}>{routineScheduleLabel(routine)}</Caption>
                        </View>
                        {next ? (
                          <View>
                            <Pill label={nextLabel(next)} color={colors.routine} />
                          </View>
                        ) : null}
                        <SymbolIcon name="chevronRight" color={colors.tertiary} size={14} />
                      </Row>
                    );
                  })}
                </Card>
              </>
            ) : null}

            {archived.length > 0 ? (
              <>
                <SectionHeader title="Archiv" />
                <Card clip>
                  {archived.map((routine, index) => (
                    <Row
                      key={routine.id}
                      last={index === archived.length - 1}
                      onPress={() => openRoutine(routine)}
                      accessibilityLabel={routine.title}>
                      <Text style={[ui.title, styles.archivedTitle]} numberOfLines={1}>
                        {routine.title}
                      </Text>
                      <View>
                        <Pill
                          label={ROUTINE_STATUS_LABELS[routine.status]}
                          color={routine.status === 'paused' ? palette.orange : palette.gray}
                        />
                      </View>
                      <SymbolIcon name="chevronRight" color={colors.tertiary} size={14} />
                    </Row>
                  ))}
                </Card>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 32,
  },
  pressed: {
    opacity: 0.4,
  },
  cards: {
    gap: 10,
  },
  quoteCard: {
    padding: 16,
  },
  archivedTitle: {
    flex: 1,
    fontWeight: '400',
    color: colors.secondary,
  },
});
