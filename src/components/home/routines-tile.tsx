import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SymbolIcon } from '@/components/symbol-icon';
import { Card, IconBadge } from '@/components/ui';
import { colors, palette } from '@/constants/colors';
import { formatMinutes } from '@/constants/labels';
import { formatPreferredTime } from '@/lib/data';
import type { Routine, RoutineLogStatus } from '@/types/database';

export type TodayRoutine = {
  routine: Routine;
  logStatus: RoutineLogStatus | null;
};

/** Today's due routines with a one-tap check-off. */
export function RoutinesTile({
  items,
  onOpen,
  onOpenRoutine,
  onToggle,
  onCreate,
}: {
  items: TodayRoutine[];
  onOpen: () => void;
  onOpenRoutine: (routine: Routine) => void;
  onToggle: (routine: Routine) => void;
  onCreate: () => void;
}) {
  const done = items.filter((item) => item.logStatus === 'done').length;
  const caption =
    items.length === 0
      ? 'Zatím žádná na dnes'
      : done === items.length
        ? 'Všechno hotovo'
        : `${done} z ${items.length} hotovo`;

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Rutiny, ${caption}`}
          onPress={onOpen}
          style={({ pressed }) => [styles.titleRow, pressed && styles.pressed]}>
          <IconBadge name="routine" color={colors.routine} />
          <View style={styles.titleText}>
            <Text style={styles.label}>Rutiny</Text>
            <Text style={styles.caption} numberOfLines={1}>
              {caption}
            </Text>
          </View>
        </Pressable>
        {items.length === 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Přidat rutinu"
            hitSlop={8}
            onPress={onCreate}
            style={({ pressed }) => [styles.write, pressed && styles.pressed]}>
            <Text style={styles.writeText}>Přidat</Text>
          </Pressable>
        ) : (
          <SymbolIcon
            name={done === items.length ? 'check' : 'chevronRight'}
            color={done === items.length ? palette.green : colors.tertiary}
            size={done === items.length ? 26 : 16}
          />
        )}
      </View>

      {items.length > 0 ? (
        <View style={styles.list}>
          {items.map((item, index) => {
            const doneToday = item.logStatus === 'done';
            const skipped = item.logStatus === 'skipped';
            const time = formatPreferredTime(item.routine.preferred_time);
            const meta = [
              item.routine.duration_minutes ? formatMinutes(item.routine.duration_minutes) : null,
              time,
              skipped ? 'Přeskočeno' : null,
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <View
                key={item.routine.id}
                style={[styles.row, index < items.length - 1 && styles.rowBorder]}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: doneToday }}
                  accessibilityLabel={doneToday ? 'Zrušit hotovo' : 'Označit jako hotové'}
                  hitSlop={8}
                  onPress={() => onToggle(item.routine)}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <View style={[styles.check, doneToday && styles.checkDone, skipped && styles.checkSkipped]}>
                    {doneToday || skipped ? (
                      <SymbolIcon
                        name={doneToday ? 'checkmark' : 'close'}
                        color="#FFFFFF"
                        size={14}
                        weight="bold"
                      />
                    ) : null}
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.routine.title}
                  onPress={() => onOpenRoutine(item.routine)}
                  style={({ pressed }) => [styles.rowText, pressed && styles.pressed]}>
                  <Text
                    style={[styles.rowTitle, (doneToday || skipped) && styles.rowTitleDone]}
                    numberOfLines={1}>
                    {item.routine.title}
                  </Text>
                  {meta ? (
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {meta}
                    </Text>
                  ) : null}
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    gap: 14,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleText: {
    flex: 1,
    gap: 1,
  },
  label: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  caption: {
    color: colors.secondary,
    fontSize: 13,
    lineHeight: 18,
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
  list: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.routine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: colors.routine,
    borderColor: colors.routine,
  },
  checkSkipped: {
    backgroundColor: colors.muted,
    borderColor: colors.muted,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  rowTitleDone: {
    color: colors.secondary,
    fontWeight: '500',
  },
  rowMeta: {
    color: colors.secondary,
    fontSize: 13,
  },
});
