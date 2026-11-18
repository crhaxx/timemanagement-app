import { numericValue } from '@/constants/labels';
import { daysUntil } from '@/lib/dates';
import type { Goal } from '@/types/database';

export const TASK_COLUMNS =
  'id, title, notes, context, effort_minutes, priority, status, deadline, goal_id, created_at';

export const GOAL_COLUMNS =
  'id, parent_id, title, description, target_value, current_value, unit, deadline, status, created_at, updated_at';

/** 0..1 progress when both values are numbers, `null` for text goals. */
export function goalProgress(goal: Goal) {
  const current = numericValue(goal.current_value);
  const target = numericValue(goal.target_value);
  if (current === null || target === null || target <= 0) return null;
  return Math.min(1, Math.max(0, current / target));
}

export type GoalPace = { amount: number; period: 'denně' | 'týdně' | 'měsíčně' };

/**
 * How much of the goal's unit has to be added per day, week or month to reach the
 * target by the deadline. `null` when the goal is not measurable, already reached,
 * or has no deadline ahead.
 */
export function goalPace(goal: Goal): GoalPace | null {
  const current = numericValue(goal.current_value);
  const target = numericValue(goal.target_value);
  if (current === null || target === null || !goal.deadline) return null;
  const remaining = target - current;
  const days = daysUntil(goal.deadline.slice(0, 10));
  if (remaining <= 0 || days <= 0) return null;

  const [perPeriod, period] =
    days >= 60
      ? ([remaining / (days / 30.44), 'měsíčně'] as const)
      : days >= 14
        ? ([remaining / (days / 7), 'týdně'] as const)
        : ([remaining / days, 'denně'] as const);

  // Two significant digits: the pace is a guide, not an invoice.
  const step = perPeriod >= 10 ? 10 ** (Math.floor(Math.log10(perPeriod)) - 1) : 0.1;
  return { amount: Math.round(perPeriod / step) * step, period };
}
