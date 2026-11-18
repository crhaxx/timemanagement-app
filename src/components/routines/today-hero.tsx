import { StyleSheet, Text, View } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';

import { czechRoutines } from '@/components/routines/day-state';
import { QuoteBlock } from '@/components/routines/quote-block';
import { SymbolIcon } from '@/components/symbol-icon';
import { ROUNDED } from '@/components/ui';
import { colors, onInk } from '@/constants/colors';
import { formatMinutes, WEEKDAY_LABELS } from '@/constants/labels';
import { czechDays, formatJournalDate, isoWeekday } from '@/lib/dates';
import type { DaySummary } from '@/lib/routines';
import type { RoutineLogStatus } from '@/types/database';

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
const BAR_HEIGHT = 36;

export type HeroItem = {
  id: string;
  status: RoutineLogStatus | null;
  minutes: number | null;
};

/** Today at a glance: how far along, the week behind it, and a push to keep going. */
export function TodayHero({
  today,
  items,
  week,
  streak,
}: {
  today: string;
  items: HeroItem[];
  /** Seven days ending today, oldest first. */
  week: DaySummary[];
  streak: number;
}) {
  const total = items.length;
  const done = items.filter((item) => item.status === 'done').length;
  const open = items.filter((item) => item.status !== 'done' && item.status !== 'skipped');
  const minutes = open.reduce((sum, item) => sum + (item.minutes ?? 0), 0);
  const settled = total > 0 && open.length === 0;
  const accent = settled ? onInk.green : onInk.teal;

  const effort = minutes > 0 ? ` · asi ${formatMinutes(minutes)}` : '';
  const status =
    total === 0
      ? 'Dnes nic v plánu. Nabij se na zítřek.'
      : settled
        ? done === total
          ? 'Všechno hotovo. Dnešek je tvůj.'
          : 'Na dnešek vyřízeno.'
        : done === 0
          ? `Čeká ${czechRoutines(total)}${effort}`
          : `${open.length >= 2 && open.length <= 4 ? 'Zbývají' : 'Zbývá'} ${czechRoutines(open.length)}${effort}`;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.eyebrow} numberOfLines={1}>
          {formatJournalDate(today)}
        </Text>
        {streak > 0 ? (
          <View
            style={styles.streak}
            accessible
            accessibilityLabel={`Série ${czechDays(streak)} v řadě`}>
            <SymbolIcon name="flame" color={onInk.orange} size={13} />
            <Text style={styles.streakText}>{czechDays(streak)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.main}>
        {total > 0 ? (
          <View
            style={styles.count}
            accessible
            accessibilityLabel={`${done} z ${total} hotovo`}>
            <Text style={[styles.done, { color: settled ? onInk.green : colors.inkText }]}>{done}</Text>
            <Text style={styles.total}>/{total}</Text>
          </View>
        ) : (
          <Text style={styles.free}>Volno</Text>
        )}
        <View style={styles.week}>
          {week.map((day) => {
            const ratio = day.due > 0 ? (day.done + day.skipped) / day.due : 0;
            const isToday = day.date === today;
            return (
              <View key={day.date} style={styles.weekDay}>
                <View style={[styles.bar, day.due === 0 && styles.barIdle]}>
                  <Animated.View
                    style={[
                      styles.barFill,
                      {
                        height: Math.round(BAR_HEIGHT * ratio),
                        backgroundColor: ratio >= 1 ? accent : onInk.teal,
                        opacity: ratio >= 1 || isToday ? 1 : 0.55,
                        // Out of flow and childless, so animating its height moves nothing else.
                        transitionProperty: ['height', 'backgroundColor'],
                        transitionDuration: '260ms',
                        transitionTimingFunction: EASE_OUT,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.weekLabel, isToday && styles.weekLabelToday]}>
                  {WEEKDAY_LABELS[isoWeekday(day.date)]}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {total > 0 ? (
        <View style={[styles.segments, total > 12 && styles.segmentsDense]}>
          {items.map((item) => (
            <Animated.View
              key={item.id}
              style={[
                styles.segment,
                {
                  backgroundColor:
                    item.status === 'done'
                      ? accent
                        : item.status === 'skipped'
                        ? colors.inkSecondary
                        : colors.inkFill,
                  transitionProperty: 'backgroundColor',
                  transitionDuration: '260ms',
                  transitionTimingFunction: EASE_OUT,
                },
              ]}
            />
          ))}
        </View>
      ) : null}

      <Text style={styles.status}>{status}</Text>

      <View style={styles.divider} />

      <QuoteBlock
        tone="ink"
        accent={accent}
        mood={total === 0 ? 'build' : settled && done > 0 ? 'done' : 'start'}
        seed={today}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.ink,
    borderRadius: 26,
    borderCurve: 'continuous',
    padding: 20,
    gap: 14,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 26,
  },
  eyebrow: {
    flex: 1,
    color: colors.inkSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 159, 10, 0.18)',
  },
  streakText: {
    color: onInk.orange,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  main: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  count: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  done: {
    fontFamily: ROUNDED,
    fontSize: 64,
    lineHeight: 68,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  total: {
    fontFamily: ROUNDED,
    color: colors.inkSecondary,
    fontSize: 30,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  free: {
    color: colors.inkText,
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '700',
  },
  week: {
    flexDirection: 'row',
    gap: 5,
    paddingBottom: 6,
  },
  weekDay: {
    width: 18,
    alignItems: 'center',
    gap: 6,
  },
  bar: {
    width: 6,
    height: BAR_HEIGHT,
    borderRadius: 3,
    backgroundColor: colors.inkFill,
    overflow: 'hidden',
  },
  barIdle: {
    opacity: 0.45,
  },
  barFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 3,
  },
  weekLabel: {
    color: colors.inkSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  weekLabelToday: {
    color: colors.inkText,
  },
  segments: {
    flexDirection: 'row',
    gap: 4,
  },
  segmentsDense: {
    gap: 2,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  status: {
    color: colors.inkSecondary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: onInk.separator,
  },
});
