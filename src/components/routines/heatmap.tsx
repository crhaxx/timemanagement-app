import { StyleSheet, Text, View } from 'react-native';

import { dayStateColor } from '@/components/routines/day-state';
import { colors } from '@/constants/colors';
import { isoWeekday, parseLocalDate, shiftDate } from '@/lib/dates';
import { routineDayState, type DayState, type LogIndex } from '@/lib/routines';
import type { Routine } from '@/types/database';

const LEGEND: { state: DayState; label: string }[] = [
  { state: 'done', label: 'Hotovo' },
  { state: 'skipped', label: 'Přeskočeno' },
  { state: 'missed', label: 'Vynecháno' },
  { state: 'off', label: 'Volno' },
];

const ROW_LABELS = ['Po', '', 'St', '', 'Pá', '', 'Ne'];

function monthShort(iso: string) {
  return parseLocalDate(iso).toLocaleDateString('cs-CZ', { month: 'short' }).replace('.', '');
}

/** The last weeks as a grid: one column per week, Monday on top, this week on the right. */
export function Heatmap({
  routine,
  logs,
  today,
  weeks = 15,
}: {
  routine: Routine;
  logs: LogIndex;
  today: string;
  weeks?: number;
}) {
  const thisMonday = shiftDate(today, 1 - isoWeekday(today));
  const columns = Array.from({ length: weeks }, (_, week) => {
    const monday = shiftDate(thisMonday, (week - weeks + 1) * 7);
    const days = Array.from({ length: 7 }, (_, day) => {
      const date = shiftDate(monday, day);
      return { date, state: routineDayState(routine, logs, date, today) };
    });
    // Name a month above the week its first day falls into.
    const first = days.find((day) => parseLocalDate(day.date).getDate() === 1);
    return { monday, days, month: first ? monthShort(first.date) : null };
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        <View style={styles.rowLabels}>
          <View style={styles.monthRow} />
          {ROW_LABELS.map((label, index) => (
            <View key={index} style={styles.rowLabelCell}>
              <Text style={styles.rowLabel}>{label}</Text>
            </View>
          ))}
        </View>
        {columns.map((column) => (
          <View key={column.monday} style={styles.column}>
            <View style={styles.monthRow}>
              {column.month ? (
                <Text style={styles.month} numberOfLines={1}>
                  {column.month}
                </Text>
              ) : null}
            </View>
            {column.days.map((day) => (
              <View
                key={day.date}
                style={[
                  styles.cell,
                  day.state === 'future'
                    ? styles.cellFuture
                    : day.state === 'pending'
                      ? styles.cellPending
                      : { backgroundColor: dayStateColor(day.state) },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        {LEGEND.map((item) => (
          <View key={item.state} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: dayStateColor(item.state) }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  grid: {
    flexDirection: 'row',
    gap: 3,
  },
  rowLabels: {
    width: 18,
    gap: 3,
  },
  rowLabelCell: {
    flex: 1,
    justifyContent: 'center',
  },
  rowLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  column: {
    flex: 1,
    gap: 3,
  },
  monthRow: {
    height: 14,
    // Month names are wider than one column; let them run over the next weeks.
    overflow: 'visible',
  },
  month: {
    position: 'absolute',
    left: 0,
    width: 40,
    color: colors.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  cell: {
    aspectRatio: 1,
    borderRadius: 4,
    borderCurve: 'continuous',
  },
  cellFuture: {
    backgroundColor: 'transparent',
  },
  cellPending: {
    borderWidth: 1.5,
    borderColor: colors.routine,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 14,
    rowGap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 3,
  },
  legendText: {
    color: colors.secondary,
    fontSize: 12,
  },
});
