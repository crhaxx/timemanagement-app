import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { SymbolIcon } from '@/components/symbol-icon';
import { TaskRow } from '@/components/task-row';
import { Card, Chip, Caption, EmptyState, ErrorBanner, ui } from '@/components/ui';
import { colors } from '@/constants/colors';
import {
  CONTEXT_COLORS,
  CONTEXT_LABELS,
  PRIORITY_ORDER,
  formatMinutes,
} from '@/constants/labels';
import { confirmDestructive, showActions } from '@/lib/actions';
import { GOAL_COLUMNS, TASK_COLUMNS } from '@/lib/data';
import { haptic } from '@/lib/haptics';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { Goal, Task, TaskContext } from '@/types/database';

type Filter = TaskContext | 'all';

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(supabase !== null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  const load = useCallback(async () => {
    if (!supabase) return;
    const [taskRows, goalRows] = await Promise.all([
      supabase.from('tasks').select(TASK_COLUMNS).eq('status', 'backlog'),
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

  const contexts = useMemo(
    () =>
      (Object.keys(CONTEXT_LABELS) as TaskContext[])
        .map((ctx) => ({ ctx, count: tasks.filter((task) => task.context === ctx).length }))
        .filter((item) => item.count > 0),
    [tasks],
  );

  const activeFilter: Filter = filter !== 'all' && !contexts.some((item) => item.ctx === filter) ? 'all' : filter;

  const visible = useMemo(
    () =>
      tasks
        .filter((task) => activeFilter === 'all' || task.context === activeFilter)
        .sort(
          (a, b) =>
            PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
            b.created_at.localeCompare(a.created_at),
        ),
    [activeFilter, tasks],
  );

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
    setTasks((current) => current.filter((item) => item.id !== task.id));
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
    showActions(task.title, [
      {
        label: 'Hotovo',
        onPress: () => {
          haptic.success();
          void completeTask(task);
        },
      },
      {
        label: 'Smazat',
        destructive: true,
        onPress: () =>
          confirmDestructive('Smazat úkol', `Opravdu smazat „${task.title}“?`, 'Smazat', () => {
            void deleteTask(task);
          }),
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
        ) : tasks.length === 0 ? (
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
              style={styles.filterScroll}>
              <Chip
                label={`Vše ${tasks.length}`}
                selected={activeFilter === 'all'}
                onPress={() => setFilter('all')}
              />
              {contexts.map(({ ctx, count }) => (
                <Chip
                  key={ctx}
                  label={`${CONTEXT_LABELS[ctx]} ${count}`}
                  color={CONTEXT_COLORS[ctx]}
                  selected={activeFilter === ctx}
                  onPress={() => setFilter(ctx)}
                />
              ))}
            </ScrollView>

            <View style={styles.summary}>
              <Caption>
                {visible.length} {visible.length === 1 ? 'úkol' : visible.length < 5 ? 'úkoly' : 'úkolů'} ·{' '}
                {formatMinutes(totalMinutes)}
              </Caption>
            </View>

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
                  onPress={() => openActions(task)}
                />
              ))}
            </Card>
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
});
