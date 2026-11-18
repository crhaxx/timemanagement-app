import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckButton } from '@/components/routines/check-button';
import { dayStateColor } from '@/components/routines/day-state';
import { SymbolIcon } from '@/components/symbol-icon';
import { Card } from '@/components/ui';
import { colors, palette, tint } from '@/constants/colors';
import { formatMinutes } from '@/constants/labels';
import { formatPreferredTime, routineScheduleLabel } from '@/lib/data';
import { czechDays } from '@/lib/dates';
import type { DayState } from '@/lib/routines';
import type { Routine, RoutineLogStatus } from '@/types/database';

/** Flame and a day count; shown once a streak is worth protecting. */
export function StreakBadge({ days, capped }: { days: number; capped?: boolean }) {
  return (
    <View style={styles.streak} accessible accessibilityLabel={`Série ${czechDays(days)}`}>
      <SymbolIcon name="flame" color={palette.orange} size={13} />
      <Text style={styles.streakText}>
        {days}
        {capped ? '+' : ''}
      </Text>
    </View>
  );
}

/** The last days as dots, oldest first, the final one being today. */
export function DayDots({ days }: { days: DayState[] }) {
  return (
    <View style={styles.dots}>
      {days.map((state, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            state === 'pending' ? styles.dotPending : { backgroundColor: dayStateColor(state) },
          ]}
        />
      ))}
    </View>
  );
}

/** A routine due today: check it off on the left, open it anywhere else. */
export function RoutineCard({
  routine,
  status,
  streak,
  streakCapped,
  days,
  onPress,
  onToggle,
  onLongPress,
}: {
  routine: Routine;
  status: RoutineLogStatus | null;
  streak: number;
  /** The streak reaches the edge of the loaded history and is likely longer. */
  streakCapped?: boolean;
  days: DayState[];
  onPress: () => void;
  onToggle: () => void;
  onLongPress: () => void;
}) {
  const settled = status === 'done' || status === 'skipped';
  const time = formatPreferredTime(routine.preferred_time);
  const duration = routine.duration_minutes ? formatMinutes(routine.duration_minutes) : null;
  const meta = [time, duration].filter(Boolean).join(' · ') || routineScheduleLabel(routine);

  return (
    <Card style={styles.card}>
      <CheckButton status={status} onPress={onToggle} size={44} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={routine.title}
        accessibilityHint="Podržením zobrazíš další možnosti"
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}>
        <View style={styles.text}>
          <Text style={[styles.title, settled && styles.titleSettled]} numberOfLines={2}>
            {routine.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {status === 'skipped' ? `Přeskočeno · ${meta}` : meta}
          </Text>
          <DayDots days={days} />
        </View>
        {streak >= 2 ? <StreakBadge days={streak} capped={streakCapped} /> : null}
        <SymbolIcon name="chevronRight" color={colors.tertiary} size={14} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingLeft: 14,
    paddingRight: 16,
    paddingVertical: 14,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pressed: {
    opacity: 0.5,
  },
  text: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  titleSettled: {
    color: colors.secondary,
  },
  meta: {
    color: colors.secondary,
    fontSize: 14,
    lineHeight: 19,
    fontVariant: ['tabular-nums'],
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotPending: {
    borderWidth: 1.5,
    borderColor: colors.routine,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 26,
    paddingHorizontal: 9,
    borderRadius: 13,
    backgroundColor: tint(palette.orange, 0.13),
  },
  streakText: {
    color: palette.orange,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
