import { StyleSheet, Text, View } from 'react-native';

import { SymbolIcon } from '@/components/symbol-icon';
import { Card, Eyebrow, ProgressBar, ROUNDED } from '@/components/ui';
import { colors } from '@/constants/colors';
import { formatAmount, goalStatusLabel } from '@/constants/labels';
import { goalPace, goalProgress } from '@/lib/data';
import { formatDeadlineLabel } from '@/lib/dates';
import type { Goal } from '@/types/database';

/** The main goal: how far it is, how much is left and what pace gets it done in time. */
export function GoalSummary({ goal, onPress }: { goal: Goal; onPress: () => void }) {
  const progress = goalProgress(goal);
  const pace = goalPace(goal);
  const statusLabel = goalStatusLabel(goal.current_value, goal.target_value, goal.unit);
  const deadline = goal.deadline ? formatDeadlineLabel(goal.deadline.slice(0, 10)).split(' · ')[0] : null;

  return (
    <Card onPress={onPress} style={styles.card} accessibilityLabel={`Hlavní cíl, ${goal.title}`}>
      <View style={styles.head}>
        <Eyebrow style={styles.flex}>Hlavní cíl</Eyebrow>
        <SymbolIcon name="chevronRight" color={colors.tertiary} size={13} weight="semibold" />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {goal.title}
      </Text>

      {progress !== null ? (
        <>
          <View style={styles.figures}>
            <Text style={styles.percent}>
              {Math.round(progress * 100)}
              <Text style={styles.percentSign}> %</Text>
            </Text>
            <View style={styles.amounts}>
              <Text style={styles.amount} numberOfLines={2}>
                {statusLabel}
              </Text>
            </View>
          </View>
          <ProgressBar value={progress} color={colors.goal} />
        </>
      ) : statusLabel ? (
        <Text style={styles.description} numberOfLines={2}>
          {statusLabel}
        </Text>
      ) : goal.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {goal.description}
        </Text>
      ) : null}

      {deadline || pace ? (
        <View style={styles.foot}>
          <Text style={[styles.note, styles.flex]} numberOfLines={1}>
            {deadline ?? ''}
          </Text>
          {pace ? (
            <Text style={styles.note} numberOfLines={1}>
              ≈ {formatAmount(pace.amount, goal.unit)} {pace.period}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    padding: 16,
    gap: 10,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  figures: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
  },
  percent: {
    color: colors.text,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '700',
    fontFamily: ROUNDED,
    fontVariant: ['tabular-nums'],
  },
  percentSign: {
    color: colors.secondary,
    fontSize: 20,
    fontWeight: '600',
  },
  amounts: {
    flexShrink: 1,
    alignItems: 'flex-end',
    paddingBottom: 5,
  },
  amount: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  note: {
    color: colors.secondary,
    fontSize: 13,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
  description: {
    color: colors.secondary,
    fontSize: 15,
    lineHeight: 20,
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
});
