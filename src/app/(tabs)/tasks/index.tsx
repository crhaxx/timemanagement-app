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
import { TaskRow } from '@/components/task-row';
import { Card, Chip, Caption, EmptyState, ErrorBanner, ui } from '@/components/ui';
import { colors } from '@/constants/colors';
import { PRIORITY_ORDER, formatMinutes } from '@/constants/labels';
import { contextCounts, contextMeta, useFocusAreas } from '@/lib/focus-areas';
import { TaskSheet } from '@/components/task-sheet';
import { GOAL_COLUMNS, TASK_COLUMNS } from '@/lib/data';
import { daysUntil, formatTaskHeading } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { Goal, Task } from '@/types/database';

type Filter = string | 'all';

function taskCountLabel(count: number, done: boolean) {
  if (done) {
    if (count === 1) return '1 splněný';
    if (count < 5) return `${count} splněné`;
    return `${count} splněných`;
  }
  if (count === 1) return '1 úkol';
  if (count < 5) return `${count} úkoly`;
  return `${count} úkolů`;
}

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const { areas } = useFocusAreas();
  const [filter, setFilter] = useState<Filter>('all');
  const [showDone, setShowDone] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(supabase !== null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  const load = useCallback(async () => {
    if (!supabase) return;
    const [taskRows, goalRows] = await Promise.all([
      supabase.from('tasks').select(TASK_COLUMNS),
      supabase.from('goals').select(GOAL_COLUMNS),
    ]);
    const failure = taskRows.error ?? goalRows.error;
    if (failure) {
      setError(failure.message);
    } else {
      setTasks(taskRows.data ?? []);
      setGoals(goalRows.data ?? []);
      setError(null);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openTasks = useMemo(() => tasks.filter((task) => task.status === 'backlog'), [tasks]);
  const doneTasks = useMemo(() => tasks.filter((task) => task.status === 'done'), [tasks]);
  const source = showDone ? doneTasks : openTasks;

  const contexts = useMemo(() => contextCounts(source.map((task) => task.context), areas), [areas, source]);

  const activeFilter: Filter = filter !== 'all' && !contexts.some((item) => item.ctx === filter) ? 'all' : filter;

  const visible = useMemo(
    () =>
      source
        .filter((task) => activeFilter === 'all' || task.context === activeFilter)
        .sort((a, b) => {
          if (showDone) return b.created_at.localeCompare(a.created_at);
          const aDay = a.deadline?.slice(0, 10) ?? '';
          const bDay = b.deadline?.slice(0, 10) ?? '';
          if (aDay !== bDay) {
            if (!aDay) return 1;
            if (!bDay) return -1;
            return aDay.localeCompare(bDay);
          }
          return (
            PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
            b.created_at.localeCompare(a.created_at)
          );
        }),
    [activeFilter, showDone, source],
  );

  const groups = useMemo(() => {
    const buckets = new Map<string, Task[]>();
    for (const task of visible) {
      const day = task.deadline?.slice(0, 10) ?? '';
      const list = buckets.get(day) ?? [];
      list.push(task);
      buckets.set(day, list);
    }
    return [...buckets.entries()];
  }, [visible]);

  const overdueCount = openTasks.filter(
    (task) => task.deadline && daysUntil(task.deadline.slice(0, 10)) < 0,
  ).length;
  const totalMinutes = visible.reduce((sum, task) => sum + task.effort_minutes, 0);
  const goalTitles = useMemo(() => new Map(goals.map((goal) => [goal.id, goal.title])), [goals]);

  async function completeTask(task: Task) {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: 'done' })
      .eq('id', task.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setTasks((current) =>
      current.map((item) => (item.id === task.id ? { ...item, status: 'done' } : item)),
    );
  }

  async function reopenTask(task: Task) {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: 'backlog' })
      .eq('id', task.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setTasks((current) =>
      current.map((item) => (item.id === task.id ? { ...item, status: 'backlog' } : item)),
    );
  }

  async function deleteTask(task: Task) {
    if (!supabase) return;
    const { error: deleteError } = await supabase.from('tasks').delete().eq('id', task.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    haptic.warning();
    setTasks((current) => current.filter((item) => item.id !== task.id));
  }

  function openActions(task: Task) {
    haptic.light();
    setSelectedId(task.id);
  }

  const selected = tasks.find((task) => task.id === selectedId) ?? null;

  return (
    <>
      <TaskSheet
        task={selected}
        goalTitle={selected?.goal_id ? goalTitles.get(selected.goal_id) : undefined}
        onClose={() => setSelectedId(null)}
        onToggle={() => {
          if (!selected) return;
          setSelectedId(null);
          if (selected.status === 'done') {
            haptic.light();
            void reopenTask(selected);
          } else {
            haptic.success();
            void completeTask(selected);
          }
        }}
        onDelete={() => {
          if (!selected) return;
          setSelectedId(null);
          void deleteTask(selected);
        }}
      />
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nový úkol"
              hitSlop={12}
              onPress={() => {
                haptic.light();
                router.push('/new-task');
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
        ) : openTasks.length === 0 && doneTasks.length === 0 ? (
          <EmptyState
            icon="check"
            color={colors.success}
            title="Vše hotovo"
            message="Backlog je prázdný. Hoď sem další úkol nebo nápad, ať nezůstane v hlavě."
            actionTitle="Přidat úkol"
            onAction={() => router.push('/new-task')}
          />
        ) : (
          <>
            <View style={styles.segmented}>
              {[
                { done: false, label: 'Otevřené', count: openTasks.length },
                { done: true, label: 'Hotové', count: doneTasks.length },
              ].map((seg) => {
                const active = showDone === seg.done;
                return (
                  <Pressable
                    key={seg.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      haptic.tap();
                      setShowDone(seg.done);
                    }}
                    style={[styles.segment, active && styles.segmentActive]}>
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {seg.label} · {seg.count}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {!showDone && openTasks.length > 0 ? (
              <View style={styles.stats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{openTasks.length}</Text>
                  <Text style={styles.statLabel}>otevřených</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {formatMinutes(openTasks.reduce((sum, task) => sum + task.effort_minutes, 0))}
                  </Text>
                  <Text style={styles.statLabel}>celkem práce</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={[styles.statValue, overdueCount > 0 && { color: colors.danger }]}>
                    {overdueCount}
                  </Text>
                  <Text style={styles.statLabel}>po termínu</Text>
                </View>
              </View>
            ) : null}

            {contexts.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filters}
                style={styles.filterScroll}>
                <Chip
                  label={`Vše ${source.length}`}
                  selected={activeFilter === 'all'}
                  onPress={() => setFilter('all')}
                />
                {contexts.map(({ ctx, count }) => (
                  <Chip
                    key={ctx}
                    label={`${contextMeta(ctx, areas).label} ${count}`}
                    color={contextMeta(ctx, areas).color}
                    selected={activeFilter === ctx}
                    onPress={() => setFilter(ctx)}
                  />
                ))}
              </ScrollView>
            ) : null}

            {visible.length === 0 ? (
              <EmptyState
                icon="check"
                color={colors.success}
                title={showDone ? 'Zatím nic hotového' : 'Vše hotovo'}
                message={
                  showDone
                    ? 'Až úkol odškrtneš, objeví se tady.'
                    : 'Otevřené úkoly došly. Splněné najdeš pod Hotové.'
                }
                actionTitle={showDone ? undefined : 'Přidat úkol'}
                onAction={showDone ? undefined : () => router.push('/new-task')}
              />
            ) : (
              <>
                <View style={styles.summary}>
                  <Caption>
                    {taskCountLabel(visible.length, showDone)} · {formatMinutes(totalMinutes)}
                  </Caption>
                </View>

                {showDone ? (
                  <Card clip>
                    {visible.map((task, index) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        goalTitle={task.goal_id ? goalTitles.get(task.goal_id) : undefined}
                        last={index === visible.length - 1}
                        onComplete={() => {
                          void completeTask(task);
                        }}
                        onReopen={() => {
                          void reopenTask(task);
                        }}
                        onPress={() => openActions(task)}
                      />
                    ))}
                  </Card>
                ) : (
                  groups.map(([day, items]) => (
                    <View key={day || 'none'} style={styles.group}>
                      {groups.length > 1 || day ? (
                        <View style={styles.groupHeader}>
                          <Text
                            style={[
                              styles.groupTitle,
                              day && daysUntil(day) < 0 ? { color: colors.danger } : null,
                            ]}>
                            {day ? formatTaskHeading(day) : 'Bez data'}
                          </Text>
                          <Text style={styles.groupCount}>{items.length}</Text>
                        </View>
                      ) : null}
                      <Card clip>
                        {items.map((task, index) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            goalTitle={task.goal_id ? goalTitles.get(task.goal_id) : undefined}
                            last={index === items.length - 1}
                            onComplete={() => {
                              void completeTask(task);
                            }}
                            onPress={() => openActions(task)}
                          />
                        ))}
                      </Card>
                    </View>
                  ))
                )}
              </>
            )}
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
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.fill,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  segmentActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    color: colors.secondary,
    fontSize: 15,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderCurve: 'continuous',
    paddingVertical: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.secondary,
    fontSize: 12,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: colors.separator,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  groupTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  groupCount: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  filterScroll: {
    marginHorizontal: -16,
    flexGrow: 0,
  },
  filters: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  summary: {
    paddingHorizontal: 4,
    marginBottom: -4,
  },
  group: {
    gap: 8,
  },
  groupLabel: {
    paddingHorizontal: 4,
  },
});
