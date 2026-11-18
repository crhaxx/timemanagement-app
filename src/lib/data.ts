import { numericValue, ROUTINE_FREQUENCY_LABELS, WEEKDAY_LABELS } from '@/constants/labels';
import { daysUntil, isoWeekday, parseLocalDate } from '@/lib/dates';
import type { Goal, Routine } from '@/types/database';

export const TASK_COLUMNS =
  'id, title, notes, context, effort_minutes, priority, status, deadline, goal_id, created_at';

export const GOAL_COLUMNS =
  'id, parent_id, title, description, target_value, current_value, unit, deadline, status, created_at, updated_at';

export const ROUTINE_COLUMNS =
  'id, title, notes, focus_area_id, goal_id, duration_minutes, frequency, days_of_week, preferred_time, skip_rule, status, created_at, updated_at';

export const ROUTINE_LOG_COLUMNS = 'id, routine_id, log_date, status, note, created_at';

/** Whether an active routine is scheduled for the given local ISO date. */
export function isRoutineDueOn(routine: Routine, isoDate: string) {
  return routine.status === 'active' && isRoutineScheduledOn(routine, isoDate);
}

/** Whether the routine's schedule lands on the given local ISO date, whatever its status. */
export function isRoutineScheduledOn(
  routine: Pick<Routine, 'frequency' | 'days_of_week'>,
  isoDate: string,
) {
  const weekday = isoWeekday(isoDate);
  const dayOfMonth = parseLocalDate(isoDate).getDate();
  const days = routine.days_of_week ?? [];

  switch (routine.frequency) {
    case 'daily':
      return true;
    case 'weekdays':
      return weekday <= 5;
    case 'weekly':
    case 'custom':
      return days.length === 0 || days.includes(weekday);
    case 'monthly':
      return days.length === 0 || days.includes(dayOfMonth);
    default:
      return false;
  }
}

/** Short schedule label, e.g. "Každý den · 21:20" or "Po, St, Pá". */
export function routineScheduleLabel(
  routine: Pick<Routine, 'frequency' | 'days_of_week' | 'preferred_time'>,
) {
  const time = formatPreferredTime(routine.preferred_time);
  const days = routine.days_of_week ?? [];
  let base = ROUTINE_FREQUENCY_LABELS[routine.frequency];
  if (
    (routine.frequency === 'weekly' || routine.frequency === 'custom') &&
    days.length > 0 &&
    days.length < 7
  ) {
    base = [...days].sort((a, b) => a - b).map((day) => WEEKDAY_LABELS[day] ?? String(day)).join(', ');
  } else if (routine.frequency === 'monthly' && days.length === 1) {
    base = `${days[0]}. den v měsíci`;
  }
  return time ? `${base} · ${time}` : base;
}

export function formatPreferredTime(value: string | null | undefined) {
  if (!value) return null;
  return value.slice(0, 5);
}

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
