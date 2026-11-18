import { isRoutineScheduledOn, ROUTINE_LOG_COLUMNS } from '@/lib/data';
import { localDateISO, shiftDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import type { Routine, RoutineLog, RoutineLogStatus } from '@/types/database';

/**
 * What a single day means for a routine:
 * - `done` / `skipped` / `missed`: there is a log, or the day passed without one
 * - `pending`: scheduled today and not logged yet
 * - `off`: not scheduled, or outside the routine's life
 * - `future`: hasn't happened
 */
export type DayState = RoutineLogStatus | 'pending' | 'off' | 'future';

/** One routine's logs keyed by local ISO date. */
export type LogIndex = Map<string, RoutineLog>;

export function indexLogsByDate(logs: RoutineLog[]): LogIndex {
  return new Map(logs.map((log) => [log.log_date, log]));
}

export function indexLogsByRoutine(logs: RoutineLog[]) {
  const index = new Map<string, LogIndex>();
  for (const log of logs) {
    const dates = index.get(log.routine_id);
    if (dates) dates.set(log.log_date, log);
    else index.set(log.routine_id, new Map([[log.log_date, log]]));
  }
  return index;
}

export function routineStartDate(routine: Routine) {
  return localDateISO(new Date(routine.created_at));
}

export function routineDayState(
  routine: Routine,
  logs: LogIndex | undefined,
  date: string,
  today: string,
): DayState {
  if (date > today) return 'future';
  const log = logs?.get(date);
  if (log) return log.status;
  if (date < routineStartDate(routine) || !isRoutineScheduledOn(routine, date)) return 'off';
  // A paused or ended routine stops asking from the day its status changed.
  if (routine.status !== 'active' && date >= localDateISO(new Date(routine.updated_at))) return 'off';
  return date === today ? 'pending' : 'missed';
}

/**
 * Where counting for a routine begins: the day it was created, or an earlier
 * log when one exists (logs are the record, even if entered for a past day),
 * but never before `since`.
 */
function firstCountedDay(routine: Routine, logs: LogIndex | undefined, since: string) {
  let first = routineStartDate(routine);
  if (logs) {
    for (const date of logs.keys()) {
      if (date < first) first = date;
    }
  }
  return first > since ? first : since;
}

/**
 * Consecutive scheduled days done, counting back from today. Skipped and
 * unscheduled days neither add to the streak nor break it, and today only
 * counts once it is done. Stops at `since`, the oldest day logs were loaded for.
 */
export function routineStreak(routine: Routine, logs: LogIndex | undefined, today: string, since: string) {
  const floor = firstCountedDay(routine, logs, since);
  let streak = 0;
  for (let cursor = today; cursor >= floor; cursor = shiftDate(cursor, -1)) {
    const state = routineDayState(routine, logs, cursor, today);
    if (state === 'done') streak += 1;
    else if (state === 'missed') break;
  }
  return streak;
}

/** Longest streak between `since` and today. */
export function routineBestStreak(routine: Routine, logs: LogIndex | undefined, today: string, since: string) {
  let best = 0;
  let run = 0;
  for (let cursor = firstCountedDay(routine, logs, since); cursor <= today; cursor = shiftDate(cursor, 1)) {
    const state = routineDayState(routine, logs, cursor, today);
    if (state === 'done') {
      run += 1;
      if (run > best) best = run;
    } else if (state === 'missed') {
      run = 0;
    }
  }
  return best;
}

/** Share of scheduled days done over the last `days` days, or `null` with nothing to judge yet. */
export function routineCompletionRate(routine: Routine, logs: LogIndex | undefined, today: string, days = 30) {
  let done = 0;
  let missed = 0;
  for (let index = 0; index < days; index += 1) {
    const state = routineDayState(routine, logs, shiftDate(today, -index), today);
    if (state === 'done') done += 1;
    else if (state === 'missed') missed += 1;
  }
  return done + missed === 0 ? null : done / (done + missed);
}

/** The next day after today the routine is scheduled for, within the coming five weeks. */
export function nextRoutineDate(routine: Routine, today: string) {
  for (let index = 1; index <= 35; index += 1) {
    const date = shiftDate(today, index);
    if (isRoutineScheduledOn(routine, date)) return date;
  }
  return null;
}

export type DaySummary = { date: string; due: number; done: number; skipped: number };

/** How a day went across all the given routines. */
export function daySummary(
  routines: Routine[],
  logsByRoutine: Map<string, LogIndex>,
  date: string,
  today: string,
): DaySummary {
  const summary: DaySummary = { date, due: 0, done: 0, skipped: 0 };
  for (const routine of routines) {
    const state = routineDayState(routine, logsByRoutine.get(routine.id), date, today);
    if (state === 'off' || state === 'future') continue;
    summary.due += 1;
    if (state === 'done') summary.done += 1;
    else if (state === 'skipped') summary.skipped += 1;
  }
  return summary;
}

/**
 * Days in a row on which every scheduled routine was dealt with. Days with
 * nothing scheduled, or with everything skipped, are passed over; today breaks
 * nothing while it is still open.
 */
export function perfectDayStreak(
  routines: Routine[],
  logsByRoutine: Map<string, LogIndex>,
  today: string,
  since: string,
) {
  let streak = 0;
  for (let cursor = today; cursor >= since; cursor = shiftDate(cursor, -1)) {
    const { due, done, skipped } = daySummary(routines, logsByRoutine, cursor, today);
    if (due === 0) continue;
    if (done + skipped === due) {
      if (done > 0) streak += 1;
    } else if (cursor !== today) {
      break;
    }
  }
  return streak;
}

const PAGE = 1000;

/** Every log since the given day, newest first, optionally for one routine. */
export async function fetchRoutineLogsSince(since: string, routineId?: string) {
  const rows: RoutineLog[] = [];
  if (!supabase) return { data: rows, error: null };

  for (let from = 0; ; from += PAGE) {
    const base = supabase.from('routine_logs').select(ROUTINE_LOG_COLUMNS).gte('log_date', since);
    const { data, error } = await (routineId ? base.eq('routine_id', routineId) : base)
      .order('log_date', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return { data: rows, error: error.message };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return { data: rows, error: null };
}

/**
 * Writes one day's log: `status: null` deletes it, anything else inserts or
 * updates. A note left `undefined` keeps whatever note the day already had.
 */
export async function writeRoutineLog({
  routineId,
  date,
  existing,
  status,
  note,
}: {
  routineId: string;
  date: string;
  existing: RoutineLog | null;
  status: RoutineLogStatus | null;
  note?: string | null;
}): Promise<{ log: RoutineLog | null; error: string | null }> {
  if (!supabase) return { log: existing, error: null };

  if (status === null) {
    if (!existing) return { log: null, error: null };
    const { error } = await supabase.from('routine_logs').delete().eq('id', existing.id);
    return error ? { log: existing, error: error.message } : { log: null, error: null };
  }

  const nextNote = note !== undefined ? note : (existing?.note ?? null);
  const result = existing
    ? await supabase
        .from('routine_logs')
        .update({ status, note: nextNote })
        .eq('id', existing.id)
        .select(ROUTINE_LOG_COLUMNS)
        .single()
    : await supabase
        .from('routine_logs')
        .insert({ routine_id: routineId, log_date: date, status, note: nextNote })
        .select(ROUTINE_LOG_COLUMNS)
        .single();

  return result.error
    ? { log: existing, error: result.error.message }
    : { log: result.data, error: null };
}
