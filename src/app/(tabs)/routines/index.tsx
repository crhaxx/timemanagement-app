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
import { formatMinutes, ROUTINE_STATUS_LABELS } from '@/constants/labels';
import { showActions } from '@/lib/actions';
import {
  isRoutineDueOn,
  ROUTINE_COLUMNS,
  ROUTINE_LOG_COLUMNS,
  routineScheduleLabel,
} from '@/lib/data';
import { localDateISO } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { Routine, RoutineLog, RoutineLogStatus } from '@/types/database';

export default function RoutinesScreen() {
  const today = localDateISO();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [loading, setLoading] = useState(supabase !== null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  const load = useCallback(async () => {
    if (!supabase) return;
    const [routineRows, logRows] = await Promise.all([
      supabase.from('routines').select(ROUTINE_COLUMNS).order('created_at', { ascending: true }),
      supabase.from('routine_logs').select(ROUTINE_LOG_COLUMNS).eq('log_date', today),
    ]);
    const failure = routineRows.error ?? logRows.error;
    if (failure) {
      setError(failure.message);
    } else {
      setRoutines(routineRows.data ?? []);
      setLogs(logRows.data ?? []);
      setError(null);
    }
    setLoading(false);
    setRefreshing(false);
  }, [today]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const logByRoutine = useMemo(() => {
    const map = new Map<string, RoutineLog>();
    for (const log of logs) map.set(log.routine_id, log);
    return map;
  }, [logs]);

  const { dueToday, otherActive, archived } = useMemo(() => {
    const active = routines.filter((routine) => routine.status === 'active');
    return {
      dueToday: active.filter((routine) => isRoutineDueOn(routine, today)),
      otherActive: active.filter((routine) => !isRoutineDueOn(routine, today)),
      archived: routines.filter((routine) => routine.status !== 'active'),
    };
  }, [routines, today]);

  async function setTodayStatus(routine: Routine, status: RoutineLogStatus | null) {
    if (!supabase) return;
    const existing = logByRoutine.get(routine.id);

    if (status === null) {
      if (!existing) return;
      const { error: deleteError } = await supabase.from('routine_logs').delete().eq('id', existing.id);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }
      setLogs((current) => current.filter((log) => log.id !== existing.id));
      haptic.light();
      return;
    }

    const payload = {
      routine_id: routine.id,
      log_date: today,
      status,
      note: existing?.note ?? null,
    };
    const result = existing
      ? await supabase
          .from('routine_logs')
          .update({ status: payload.status, note: payload.note })
          .eq('id', existing.id)
          .select(ROUTINE_LOG_COLUMNS)
          .single()
      : await supabase.from('routine_logs').insert(payload).select(ROUTINE_LOG_COLUMNS).single();

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setLogs((current) => {
      const without = current.filter((log) => log.routine_id !== routine.id);
      return result.data ? [...without, result.data] : without;
    });
    haptic.success();
  }

  function openRoutine(routine: Routine) {
    haptic.light();
    router.push({ pathname: '/routine/[id]', params: { id: routine.id } });
  }

  function toggleDone(routine: Routine) {
    const current = logByRoutine.get(routine.id)?.status ?? null;
    void setTodayStatus(routine, current === 'done' ? null : 'done');
  }

  function promptSkip(routine: Routine) {
    const current = logByRoutine.get(routine.id)?.status ?? null;
    showActions(routine.title, [
      {
        label: current === 'done' ? 'Zrušit hotovo' : 'Hotovo',
        onPress: () => {
          void setTodayStatus(routine, current === 'done' ? null : 'done');
        },
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
          <EmptyState
            icon="routine"
            color={colors.routine}
            title="Co chceš opakovat?"
            message="Rutiny jsou malé návyky, které chceš dělat pravidelně — cvičení, čtení, úklid."
            actionTitle="Přidat první rutinu"
            onAction={() => router.push('/new-routine')}
          />
        ) : (
          <>
            {dueToday.length > 0 ? (
              <>
                <SectionHeader title="Dnes" />
                <Card clip>
                  {dueToday.map((routine, index) => (
                    <RoutineRow
                      key={routine.id}
                      routine={routine}
                      logStatus={logByRoutine.get(routine.id)?.status ?? null}
                      last={index === dueToday.length - 1}
                      showCheck
                      onPress={() => openRoutine(routine)}
                      onToggle={() => toggleDone(routine)}
                      onLongPress={() => promptSkip(routine)}
                    />
                  ))}
                </Card>
              </>
            ) : null}

            {otherActive.length > 0 ? (
              <>
                <SectionHeader title="Ostatní aktivní" />
                <Card clip>
                  {otherActive.map((routine, index) => (
                    <RoutineRow
                      key={routine.id}
                      routine={routine}
                      logStatus={null}
                      last={index === otherActive.length - 1}
                      onPress={() => openRoutine(routine)}
                    />
                  ))}
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
                      <Pill
                        label={ROUTINE_STATUS_LABELS[routine.status]}
                        color={routine.status === 'paused' ? palette.orange : palette.gray}
                      />
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

function RoutineRow({
  routine,
  logStatus,
  last,
  showCheck,
  onPress,
  onToggle,
  onLongPress,
}: {
  routine: Routine;
  logStatus: RoutineLogStatus | null;
  last?: boolean;
  showCheck?: boolean;
  onPress: () => void;
  onToggle?: () => void;
  onLongPress?: () => void;
}) {
  const done = logStatus === 'done';
  const skipped = logStatus === 'skipped';
  const schedule = routineScheduleLabel(routine);
  const duration = routine.duration_minutes ? formatMinutes(routine.duration_minutes) : null;

  return (
    <View>
      <View style={styles.row}>
        {showCheck && onToggle ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            accessibilityLabel={done ? 'Zrušit hotovo' : 'Označit jako hotové'}
            hitSlop={8}
            onPress={onToggle}
            style={({ pressed }) => pressed && styles.pressed}>
            <View style={[styles.check, done && styles.checkDone, skipped && styles.checkSkipped]}>
              {done || skipped ? (
                <SymbolIcon
                  name={done ? 'checkmark' : 'close'}
                  color="#FFFFFF"
                  size={14}
                  weight="bold"
                />
              ) : null}
            </View>
          </Pressable>
        ) : (
          <TintIcon name="routine" color={colors.routine} />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={routine.title}
          onPress={onPress}
          onLongPress={onLongPress}
          style={({ pressed }) => [styles.rowBody, pressed && styles.pressed]}>
          <View style={ui.flex}>
            <Text style={[ui.title, (done || skipped) && styles.doneTitle]} numberOfLines={1}>
              {routine.title}
            </Text>
            <Caption numberOfLines={1}>
              {[schedule, duration].filter(Boolean).join(' · ')}
            </Caption>
          </View>
          {skipped && !done ? <Pill label="Přeskočeno" color={palette.gray} /> : null}
          <SymbolIcon name="chevronRight" color={colors.tertiary} size={14} />
        </Pressable>
      </View>
      {last ? null : <View style={styles.separator} />}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 32,
  },
  pressed: {
    opacity: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginLeft: 56,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.routine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: colors.routine,
    borderColor: colors.routine,
  },
  checkSkipped: {
    backgroundColor: colors.muted,
    borderColor: colors.muted,
  },
  doneTitle: {
    color: colors.secondary,
    fontWeight: '500',
  },
  archivedTitle: {
    flex: 1,
    fontWeight: '400',
    color: colors.secondary,
  },
});
