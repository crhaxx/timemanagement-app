import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FocusCard, type Focus } from '@/components/home/focus-card';
import { GoalSummary } from '@/components/home/goal-summary';
import { JournalTile, SectionTile } from '@/components/home/section-tiles';
import { SymbolIcon } from '@/components/symbol-icon';
import {
  Card,
  Caption,
  ErrorBanner,
  Eyebrow,
  IconBadge,
  PressableScale,
  shadow,
  ui,
} from '@/components/ui';
import { colors } from '@/constants/colors';
import { CONTEXT_LABELS, PRIORITY_ORDER, formatMinutes } from '@/constants/labels';
import { GOAL_COLUMNS, TASK_COLUMNS, goalProgress } from '@/lib/data';
import {
  currentStreak,
  czechDays,
  daysUntil,
  formatJournalDate,
  localDateISO,
  shiftDate,
} from '@/lib/dates';
import { showActions } from '@/lib/actions';
import { haptic } from '@/lib/haptics';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { Goal, Task, TaskContext } from '@/types/database';

const QUEUE_LENGTH = 4;
const WEEK_LENGTH = 7;

type NextStep = { goal: Goal; task: Task | null };

function byPriority(a: Task, b: Task) {
  return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.effort_minutes - b.effort_minutes;
}

/** One entry per active goal: its most pressing task, or `null` when the goal has nothing to do next. */
function buildNextSteps(goals: Goal[], tasks: Task[]) {
  const active = goals.filter((goal) => goal.status === 'active');
  const steps: NextStep[] = active
    .filter((goal) => {
      const hasChild = active.some((other) => other.parent_id === goal.id);
      const hasTask = tasks.some((task) => task.goal_id === goal.id);
      return !hasChild || hasTask;
    })
    .map((goal) => ({
      goal,
      task: tasks.filter((task) => task.goal_id === goal.id).sort(byPriority)[0] ?? null,
    }));

  steps.sort((a, b) => {
    const missing = Number(Boolean(a.task)) - Number(Boolean(b.task));
    if (missing !== 0) return missing;
    const aDays = a.goal.deadline ? daysUntil(a.goal.deadline.slice(0, 10)) : 10_000;
    const bDays = b.goal.deadline ? daysUntil(b.goal.deadline.slice(0, 10)) : 10_000;
    if (aDays !== bDays) return aDays - bDays;
    if (a.task && b.task) return PRIORITY_ORDER[a.task.priority] - PRIORITY_ORDER[b.task.priority];
    return a.goal.title.localeCompare(b.goal.title, 'cs');
  });

  return steps;
}

function nearestDeadlineLabel(goals: Goal[]) {
  if (goals.length === 0) return 'Zatím žádný';
  const nearest = goals
    .flatMap((goal) => (goal.deadline ? [goal.deadline.slice(0, 10)] : []))
    .sort()[0];
  if (!nearest) return 'Bez termínu';
  const days = daysUntil(nearest);
  if (days < 0) return 'Po termínu';
  if (days === 0) return 'Termín dnes';
  if (days === 1) return 'Termín zítra';
  return `Termín za ${czechDays(days)}`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [journalDates, setJournalDates] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(supabase !== null);
  const [refreshing, setRefreshing] = useState(false);
  const [stepGoalId, setStepGoalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  const today = localDateISO();

  const load = useCallback(async () => {
    if (!supabase) return;
    const [backlog, journal, goalRows] = await Promise.all([
      supabase.from('tasks').select(TASK_COLUMNS).eq('status', 'backlog'),
      supabase
        .from('journal_entries')
        .select('entry_date')
        .order('entry_date', { ascending: false })
        .limit(400),
      supabase.from('goals').select(GOAL_COLUMNS).order('created_at', { ascending: true }),
    ]);
    const failure = backlog.error ?? journal.error ?? goalRows.error;
    if (failure) {
      setError(failure.message);
    } else {
      setTasks(backlog.data ?? []);
      setJournalDates(new Set((journal.data ?? []).map((entry) => entry.entry_date)));
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

  const view = useMemo(() => {
    const activeGoals = goals.filter((goal) => goal.status === 'active');
    const goalById = new Map(goals.map((goal) => [goal.id, goal]));
    const steps = buildNextSteps(goals, tasks);
    const missing = steps.filter((step) => step.task === null).map((step) => step.goal);
    const stepTasks = steps.flatMap((step) => (step.task ? [step.task] : []));
    // Goal steps lead, the rest of the backlog follows by priority.
    const ordered = [...new Set([...stepTasks, ...[...tasks].sort(byPriority)])];

    const missingIndex = Math.max(
      0,
      missing.findIndex((goal) => goal.id === stepGoalId),
    );
    const focus: Focus =
      missing.length > 0
        ? { kind: 'missing', goal: missing[missingIndex], position: missingIndex + 1, total: missing.length }
        : ordered.length > 0
          ? {
              kind: 'task',
              task: ordered[0],
              goal: ordered[0].goal_id ? (goalById.get(ordered[0].goal_id) ?? null) : null,
            }
          : { kind: 'empty' };
    const focusTaskId = focus.kind === 'task' ? focus.task.id : null;

    return {
      focus,
      missing,
      missingIndex,
      goalById,
      activeGoals,
      queue: ordered.filter((task) => task.id !== focusTaskId).slice(0, QUEUE_LENGTH),
      totalMinutes: tasks.reduce((sum, task) => sum + task.effort_minutes, 0),
      byContext: (Object.keys(CONTEXT_LABELS) as TaskContext[])
        .map((ctx) => ({ ctx, count: tasks.filter((task) => task.context === ctx).length }))
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count),
      featuredGoal:
        activeGoals.find((goal) => goal.parent_id === null && goalProgress(goal) !== null) ??
        activeGoals.find((goal) => goalProgress(goal) !== null) ??
        activeGoals[0] ??
        null,
    };
  }, [goals, tasks, stepGoalId]);

  const week = useMemo(
    () => Array.from({ length: WEEK_LENGTH }, (_, index) => shiftDate(today, index - (WEEK_LENGTH - 1))),
    [today],
  );
  const streak = useMemo(() => currentStreak(journalDates, today), [journalDates, today]);

  async function completeTask(task: Task) {
    if (!supabase) return false;
    const { error: updateError } = await supabase.from('tasks').update({ status: 'done' }).eq('id', task.id);
    if (updateError) {
      setError(updateError.message);
      return false;
    }
    setTasks((current) => current.filter((item) => item.id !== task.id));
    return true;
  }

  function openTab(href: '/tasks' | '/goals' | '/journal') {
    haptic.tap();
    router.navigate(href);
  }

  function openJournalEditor(date: string) {
    haptic.light();
    router.push({ pathname: '/journal-edit', params: { date } });
  }

  const { featuredGoal } = view;

  return (
    <View style={[ui.screen, { paddingTop: insets.top }]}>
      <ScrollView
        style={ui.screen}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={ui.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
        <View style={styles.header}>
          <View style={ui.flex}>
            <Eyebrow>{formatJournalDate(today)}</Eyebrow>
            <Text accessibilityRole="header" style={styles.title}>
              Přehled
            </Text>
          </View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Přidat úkol"
            hitSlop={8}
            pressedScale={0.92}
            onPress={() => {
              haptic.light();
              showActions('Přidat', [
                { label: 'Nový úkol', onPress: () => router.push('/new-task') },
                { label: 'Nový cíl', onPress: () => router.push('/new-goal') },
                { label: 'Zápis do deníku', onPress: () => openJournalEditor(today) },
              ]);
            }}
            style={styles.add}>
            <SymbolIcon name="add" color={colors.accent} size={20} weight="semibold" />
          </PressableScale>
        </View>

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        {loading ? (
          <ActivityIndicator color={colors.muted} style={styles.loader} />
        ) : (
          <>
            <FocusCard
              focus={view.focus}
              onCompleteTask={completeTask}
              onAddStep={(goal) => {
                haptic.light();
                router.push({ pathname: '/add-step', params: { goalId: goal.id } });
              }}
              onNextGoal={() =>
                setStepGoalId(view.missing[(view.missingIndex + 1) % view.missing.length]?.id ?? null)
              }
              onNewTask={() => {
                haptic.light();
                router.push('/new-task');
              }}
            />

            <View style={styles.tiles}>
              <SectionTile
                icon="tasks"
                color={colors.task}
                label="Úkoly"
                value={tasks.length}
                caption={tasks.length > 0 ? `${formatMinutes(view.totalMinutes)} práce` : 'Nic nečeká'}
                onPress={() => {
                  haptic.light();
                  router.push('/queue');
                }}
              />
              <SectionTile
                icon="goal"
                color={colors.goal}
                label="Cíle"
                value={view.activeGoals.length}
                caption={nearestDeadlineLabel(view.activeGoals)}
                onPress={() => openTab('/goals')}
              />
            </View>

            <JournalTile
              days={week}
              today={today}
              entryDates={journalDates}
              streak={streak}
              onOpen={() => openTab('/journal')}
              onWrite={openJournalEditor}
            />

            {featuredGoal ? (
              <GoalSummary
                goal={featuredGoal}
                onPress={() => {
                  haptic.light();
                  router.push({ pathname: '/goal/[id]', params: { id: featuredGoal.id } });
                }}
              />
            ) : (
              <Card
                onPress={() => {
                  haptic.light();
                  router.push('/new-goal');
                }}
                style={styles.prompt}
                accessibilityLabel="Přidat cíl">
                <IconBadge name="goal" color={colors.goal} />
                <View style={ui.flex}>
                  <Text style={ui.title}>Přidej dlouhodobý cíl</Text>
                  <Caption>Ať víš, kam to celé směřuje.</Caption>
                </View>
                <SymbolIcon name="chevronRight" color={colors.tertiary} size={13} weight="semibold" />
              </Card>
            )}

          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 4,
    paddingTop: 16,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  add: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    backgroundColor: colors.surface,
    ...shadow,
  },
  loader: {
    marginTop: 48,
  },
  tiles: {
    flexDirection: 'row',
    gap: 12,
  },
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
});
