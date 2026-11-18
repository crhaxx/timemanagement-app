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
  PressableScale,
  ProgressBar,
  Row,
  SectionHeader,
  TintIcon,
  ui,
} from '@/components/ui';
import { colors, palette } from '@/constants/colors';
import { GOAL_STATUS_LABELS, goalStatusLabel } from '@/constants/labels';
import { GOAL_COLUMNS, goalProgress } from '@/lib/data';
import { formatDeadlineLabel, localDateISO } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { Goal } from '@/types/database';

function openGoal(goal: Goal) {
  haptic.light();
  router.push({ pathname: '/goal/[id]', params: { id: goal.id } });
}

export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(supabase !== null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error: queryError } = await supabase
      .from('goals')
      .select(GOAL_COLUMNS)
      .order('created_at', { ascending: true });
    if (queryError) {
      setError(queryError.message);
    } else {
      setGoals(data ?? []);
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

  const { roots, childrenOf, archived } = useMemo(() => {
    const active = goals.filter((goal) => goal.status === 'active');
    const activeIds = new Set(active.map((goal) => goal.id));
    return {
      roots: active.filter((goal) => !goal.parent_id || !activeIds.has(goal.parent_id)),
      childrenOf: (id: string) => active.filter((goal) => goal.parent_id === id),
      archived: goals.filter((goal) => goal.status !== 'active'),
    };
  }, [goals]);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nový cíl"
              hitSlop={12}
              onPress={() => {
                haptic.light();
                router.push('/new-goal');
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
        ) : goals.length === 0 ? (
          <EmptyState
            icon="goal"
            color={colors.goal}
            title="Kam to směřuje?"
            message="Dlouhodobý cíl s měřitelným stavem a termínem ti dá do úkolů smysl."
            actionTitle="Přidat první cíl"
            onAction={() => router.push('/new-goal')}
          />
        ) : (
          <>
            {roots.map((goal) => (
              <GoalCard key={goal.id} goal={goal} subgoals={childrenOf(goal.id)} />
            ))}

            {archived.length > 0 ? (
              <>
                <SectionHeader title="Archiv" />
                <Card clip>
                  {archived.map((goal, index) => (
                    <Row
                      key={goal.id}
                      last={index === archived.length - 1}
                      onPress={() => openGoal(goal)}
                      accessibilityLabel={goal.title}>
                      <Text style={[ui.title, styles.archivedTitle]} numberOfLines={1}>
                        {goal.title}
                      </Text>
                      <Pill
                        label={GOAL_STATUS_LABELS[goal.status]}
                        color={goal.status === 'done' ? palette.green : palette.gray}
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

function GoalCard({ goal, subgoals }: { goal: Goal; subgoals: Goal[] }) {
  const progress = goalProgress(goal);
  const statusLabel = goalStatusLabel(goal.current_value, goal.target_value, goal.unit);
  const overdue = goal.deadline ? goal.deadline < localDateISO() : false;

  return (
    <Card clip>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={goal.title}
        onPress={() => openGoal(goal)}
        pressedScale={0.985}
        style={styles.cardBody}>
        <View style={styles.top}>
          <TintIcon name="goal" color={colors.goal} />
          <View style={ui.flex}>
            <Text style={ui.title} numberOfLines={2}>
              {goal.title}
            </Text>
            {goal.deadline ? (
              <Text style={[styles.deadline, overdue && styles.overdue]}>
                {formatDeadlineLabel(goal.deadline)}
              </Text>
            ) : null}
          </View>
          {progress !== null ? (
            <Text style={styles.percent}>{Math.round(progress * 100)} %</Text>
          ) : null}
        </View>

        {progress !== null ? (
          <View style={styles.progress}>
            <ProgressBar value={progress} color={colors.goal} />
            {statusLabel ? <Caption>{statusLabel}</Caption> : null}
          </View>
        ) : statusLabel ? (
          <Caption numberOfLines={2}>{statusLabel}</Caption>
        ) : goal.description ? (
          <Caption numberOfLines={3}>{goal.description}</Caption>
        ) : null}
      </PressableScale>

      {subgoals.map((sub) => {
        const subProgress = goalProgress(sub);
        const subLabel = goalStatusLabel(sub.current_value, sub.target_value, sub.unit);
        return (
          <Row key={sub.id} inset={16} onPress={() => openGoal(sub)} accessibilityLabel={sub.title}>
            <View style={ui.flex}>
              <Text style={styles.subTitle} numberOfLines={1}>
                {sub.title}
              </Text>
              {subProgress !== null ? (
                <ProgressBar value={subProgress} color={colors.goal} height={4} />
              ) : null}
            </View>
            {subProgress !== null ? (
              <Text style={styles.subPercent}>{Math.round(subProgress * 100)} %</Text>
            ) : subLabel ? (
              <Text style={styles.subPercent} numberOfLines={1}>
                {subLabel}
              </Text>
            ) : null}
            <SymbolIcon name="chevronRight" color={colors.tertiary} size={13} />
          </Row>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 32,
  },
  pressed: {
    opacity: 0.4,
  },
  cardBody: {
    padding: 16,
    gap: 14,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  percent: {
    color: colors.goal,
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progress: {
    gap: 8,
  },
  deadline: {
    color: colors.secondary,
    fontSize: 13,
    marginTop: 2,
  },
  overdue: {
    color: colors.danger,
  },
  subTitle: {
    color: colors.text,
    fontSize: 15,
    marginBottom: 6,
  },
  subPercent: {
    color: colors.secondary,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  archivedTitle: {
    flex: 1,
    fontWeight: '400',
    color: colors.secondary,
  },
});
