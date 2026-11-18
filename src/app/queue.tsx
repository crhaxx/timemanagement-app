import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { ContextBreakdown } from '@/components/home/context-breakdown';
import { TaskRow } from '@/components/task-row';
import { Card, Caption, EmptyState, ErrorBanner, PrimaryButton, SheetHeader, ui } from '@/components/ui';
import { colors } from '@/constants/colors';
import { PRIORITY_ORDER, formatMinutes } from '@/constants/labels';
import { contextCounts, useFocusAreas } from '@/lib/focus-areas';
import { GOAL_COLUMNS, TASK_COLUMNS } from '@/lib/data';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { Goal, Task } from '@/types/database';

export default function QueueSheet() {
  const { areas } = useFocusAreas();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(supabase !== null);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  useFocusEffect(
    useCallback(() => {
      if (!supabase) return;
      void Promise.all([
        supabase.from('tasks').select(TASK_COLUMNS).eq('status', 'backlog'),
        supabase.from('goals').select(GOAL_COLUMNS),
      ]).then(([t, g]) => {
        const failure = t.error ?? g.error;
        if (failure) setError(failure.message);
        else {
          setTasks(t.data ?? []);
          setGoals(g.data ?? []);
          setError(null);
        }
        setLoading(false);
      });
    }, []),
  );

  const sorted = useMemo(
    () =>
      [...tasks].sort(
        (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.effort_minutes - b.effort_minutes,
      ),
    [tasks],
  );
  const byContext = useMemo(
    () => contextCounts(tasks.map((task) => task.context), areas).filter((item) => item.count > 0),
    [areas, tasks],
  );
  const titles = useMemo(() => new Map(goals.map((goal) => [goal.id, goal.title])), [goals]);
  const minutes = tasks.reduce((sum, task) => sum + task.effort_minutes, 0);

  async function complete(task: Task) {
    if (!supabase) return;
    const { error: updateError } = await supabase.from('tasks').update({ status: 'done' }).eq('id', task.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setTasks((current) => current.filter((item) => item.id !== task.id));
  }

  return (
    <View style={ui.screen}>
      <SheetHeader title="Úkoly" cancelLabel="Zavřít" onCancel={() => router.back()} />
      <ScrollView contentContainerStyle={ui.sheetContent}>
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        {loading ? (
          <ActivityIndicator color={colors.muted} />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon="check"
            color={colors.success}
            title="Vše hotovo"
            message="Backlog je prázdný."
            actionTitle="Přidat úkol"
            onAction={() => router.replace('/new-task')}
          />
        ) : (
          <>
            <Caption>
              {tasks.length} otevřených · {formatMinutes(minutes)} práce
            </Caption>
            {byContext.length > 1 ? <ContextBreakdown items={byContext} /> : null}
            <Card clip>
              {sorted.map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  goalTitle={task.goal_id ? titles.get(task.goal_id) : undefined}
                  last={index === sorted.length - 1}
                  onComplete={() => {
                    void complete(task);
                  }}
                />
              ))}
            </Card>
            <PrimaryButton
              title="Otevřít záložku Úkoly"
              onPress={() => {
                router.back();
                router.navigate('/tasks');
              }}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
