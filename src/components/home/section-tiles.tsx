import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SymbolIcon, type AppIconName } from '@/components/symbol-icon';
import { Card, IconBadge, ROUNDED } from '@/components/ui';
import { colors, palette } from '@/constants/colors';
import { czechDays, dayNumber, formatJournalDate, weekdayShort } from '@/lib/dates';

/** Entry point into one section of the app, with the number that matters there. */
export function SectionTile({
  icon,
  color,
  label,
  value,
  caption,
  onPress,
}: {
  icon: AppIconName;
  color: string;
  label: string;
  value: number;
  caption: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.tile} accessibilityLabel={`${label}, ${value}, ${caption}`}>
      <View style={styles.tileTop}>
        <IconBadge name={icon} color={color} />
        <Text style={styles.tileValue}>{value}</Text>
      </View>
      <View style={styles.tileText}>
        <Text style={styles.tileLabel}>{label}</Text>
        <Text style={styles.caption} numberOfLines={1}>
          {caption}
        </Text>
      </View>
    </Card>
  );
}

/** Journal section: today's state, the running streak and the last seven days. */
export function JournalTile({
  days,
  today,
  entryDates,
  streak,
  onOpen,
  onWrite,
}: {
  days: string[];
  today: string;
  entryDates: Set<string>;
  streak: number;
  onOpen: () => void;
  onWrite: (date: string) => void;
}) {
  const writtenToday = entryDates.has(today);
  const caption = writtenToday
    ? streak > 1
      ? `${czechDays(streak)} v řadě`
      : 'Dnes zapsáno'
    : streak > 0
      ? `${czechDays(streak)} v řadě, dnešek chybí`
      : 'Dnes ještě nezapsáno';

  return (
    <Card style={styles.journal}>
      <View style={styles.journalHead}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Deník, ${caption}`}
          onPress={onOpen}
          style={({ pressed }) => [styles.journalTitle, pressed && styles.pressed]}>
          <IconBadge name="journal" color={colors.journal} />
          <View style={styles.journalText}>
            <Text style={styles.tileLabel}>Deník</Text>
            <Text style={styles.caption} numberOfLines={1}>
              {caption}
            </Text>
          </View>
        </Pressable>
        {writtenToday ? (
          <SymbolIcon name="check" color={palette.green} size={26} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zapsat dnešní den"
            hitSlop={8}
            onPress={() => onWrite(today)}
            style={({ pressed }) => [styles.write, pressed && styles.pressed]}>
            <Text style={styles.writeText}>Zapsat</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.week}>
        {days.map((day) => {
          const hasEntry = entryDates.has(day);
          const isToday = day === today;
          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityLabel={`${formatJournalDate(day)}, ${hasEntry ? 'zapsáno' : 'bez zápisu'}`}
              onPress={() => onWrite(day)}
              style={({ pressed }) => [styles.day, pressed && styles.pressed]}>
              <Text style={[styles.dayName, isToday && styles.dayNameToday]}>{weekdayShort(day)}</Text>
              <View
                style={[
                  styles.dayMark,
                  hasEntry ? styles.dayMarkDone : isToday ? styles.dayMarkToday : styles.dayMarkEmpty,
                ]}>
                {hasEntry ? (
                  <SymbolIcon name="checkmark" color="#FFFFFF" size={13} weight="bold" />
                ) : (
                  <Text style={[styles.dayNumber, isToday && styles.dayNumberToday]}>{dayNumber(day)}</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    padding: 14,
    gap: 14,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileValue: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
    fontFamily: ROUNDED,
    fontVariant: ['tabular-nums'],
  },
  tileText: {
    gap: 1,
  },
  tileLabel: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  caption: {
    color: colors.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  journal: {
    padding: 14,
    gap: 16,
  },
  journalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  journalTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  journalText: {
    flex: 1,
    gap: 1,
  },
  write: {
    minHeight: 32,
    paddingHorizontal: 16,
    borderRadius: 16,
    justifyContent: 'center',
    backgroundColor: colors.fill,
  },
  writeText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.5,
  },
  week: {
    flexDirection: 'row',
  },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  dayName: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  dayNameToday: {
    color: colors.text,
    fontWeight: '700',
  },
  dayMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayMarkDone: {
    backgroundColor: colors.journal,
  },
  dayMarkEmpty: {
    backgroundColor: colors.fill,
  },
  dayMarkToday: {
    borderWidth: 1.5,
    borderColor: colors.journal,
  },
  dayNumber: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  dayNumberToday: {
    color: colors.text,
    fontWeight: '700',
  },
});
