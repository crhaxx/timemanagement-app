import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Checkbox, Pill, Row } from '@/components/ui';
import { colors } from '@/constants/colors';
import { PRIORITY_COLORS, PRIORITY_LABELS, formatMinutes } from '@/constants/labels';
import { contextMeta, useFocusAreas } from '@/lib/focus-areas';
import { daysUntil, formatTaskWhen } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import type { Task } from '@/types/database';

export function TaskRow({
  task,
  goalTitle,
  last,
  onComplete,
  onReopen,
  onPress,
}: {
  task: Task;
  goalTitle?: string;
  last: boolean;
  onComplete: () => void;
  onReopen?: () => void;
  onPress?: () => void;
}) {
  const done = task.status === 'done';
  const [checked, setChecked] = useState(done);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function toggle() {
    if (timer.current) return;
    if (checked) {
      if (!onReopen) return;
      setChecked(false);
      haptic.light();
      timer.current = setTimeout(onReopen, 380);
      return;
    }
    setChecked(true);
    haptic.success();
    timer.current = setTimeout(onComplete, 380);
  }

  const { areas } = useFocusAreas();
  const context = contextMeta(task.context, areas);
  const overdue = !done && !!task.deadline && daysUntil(task.deadline.slice(0, 10)) < 0;
  const important = task.priority === 'urgent' || task.priority === 'high';

  return (
    <Row last={last} inset={54} onPress={onPress} accessibilityLabel={task.title}>
      <View style={styles.checkWrap}>
        <Checkbox
          checked={checked}
          onPress={toggle}
          color={done ? colors.success : PRIORITY_COLORS[task.priority]}
          label={done ? `Vrátit ${task.title}` : `Dokončit ${task.title}`}
        />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, checked && styles.titleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        {task.notes ? (
          <Text style={styles.notes} numberOfLines={1}>
            {task.notes}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <Pill label={context.label} color={context.color} />
          <Pill label={formatMinutes(task.effort_minutes)} color={colors.muted} />
          {task.deadline ? (
            <Pill
              label={formatTaskWhen(task.deadline)}
              color={overdue ? colors.danger : colors.muted}
            />
          ) : null}
          {important && !done ? (
            <Pill label={PRIORITY_LABELS[task.priority]} color={PRIORITY_COLORS[task.priority]} />
          ) : null}
        </View>
        {goalTitle ? (
          <Text style={styles.goal} numberOfLines={1}>
            {goalTitle}
          </Text>
        ) : null}
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  checkWrap: {
    alignSelf: 'flex-start',
    paddingTop: 1,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 22,
  },
  titleDone: {
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  notes: {
    color: colors.secondary,
    fontSize: 15,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 5,
  },
  goal: {
    color: colors.secondary,
    fontSize: 13,
    marginTop: 4,
  },
});
