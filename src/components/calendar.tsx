import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SymbolIcon } from '@/components/symbol-icon';
import { colors } from '@/constants/colors';
import { localDateISO, parseLocalDate } from '@/lib/dates';
import { haptic } from '@/lib/haptics';

const WEEKDAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

function monthCells(year: number, month: number) {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: count }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function monthTitle(year: number, month: number) {
  const title = new Date(year, month, 1).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function Calendar({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const initial = parseLocalDate(value || localDateISO());
  const [visible, setVisible] = useState({ year: initial.getFullYear(), month: initial.getMonth() });
  const today = localDateISO();
  const cells = monthCells(visible.year, visible.month);

  function shiftMonth(by: number) {
    haptic.tap();
    setVisible((current) => {
      const next = new Date(current.year, current.month + by, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  return (
    <View style={styles.calendar}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Předchozí měsíc" hitSlop={8} onPress={() => shiftMonth(-1)}>
          <SymbolIcon name="chevronLeft" color={colors.accent} size={18} weight="semibold" />
        </Pressable>
        <Text style={styles.month}>{monthTitle(visible.year, visible.month)}</Text>
        <Pressable accessibilityLabel="Další měsíc" hitSlop={8} onPress={() => shiftMonth(1)}>
          <SymbolIcon name="chevronRight" color={colors.accent} size={18} weight="semibold" />
        </Pressable>
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={styles.weekday}>
            {day}
          </Text>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, week) => (
        <View key={week} style={styles.week}>
          {cells.slice(week * 7, week * 7 + 7).map((day, index) => {
            if (!day) return <View key={index} style={styles.day} />;
            const iso = localDateISO(new Date(visible.year, visible.month, day));
            const selected = iso === value;
            const isToday = iso === today;
            return (
              <Pressable
                key={iso}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={iso}
                onPress={() => {
                  haptic.tap();
                  onChange(iso);
                }}
                style={styles.day}>
                <View style={[styles.dayFace, selected && styles.daySelected, isToday && !selected && styles.dayToday]}>
                  <Text style={[styles.dayText, isToday && styles.dayTextToday, selected && styles.dayTextSelected]}>
                    {day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: {
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  month: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  week: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 6,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  dayFace: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    backgroundColor: colors.accent,
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  dayText: {
    color: colors.text,
    fontSize: 16,
  },
  dayTextToday: {
    color: colors.accent,
    fontWeight: '700',
  },
  dayTextSelected: {
    color: colors.accentText,
    fontWeight: '600',
  },
});
