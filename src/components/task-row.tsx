import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Checkbox, Row } from '@/components/ui';
import { colors } from '@/constants/colors';
import { CONTEXT_COLORS, CONTEXT_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, formatMinutes } from '@/constants/labels';
import { haptic } from '@/lib/haptics';
import type { Task } from '@/types/database';

export function TaskRow({
  task,
  goalTitle,
  last,
  onComplete,
  onPress,
}: {
  task: Task;
  goalTitle?: string;
  last: boolean;
  onComplete: () => void;
  onPress?: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function complete() {
    if (checked) return;
    setChecked(true);
    haptic.success();
    timer.current = setTimeout(onComplete, 380);
  }

  return (
    <Row last={last} inset={54} onPress={onPress} accessibilityLabel={task.title}>
      <Checkbox
        checked={checked}
        onPress={complete}
        color={PRIORITY_COLORS[task.priority]}
        label={`Dokončit ${task.title}`}
      />
      <View style={styles.body}>
        <Text style={[styles.title, checked && styles.titleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        {task.notes ? (
          <Text style={styles.notes} numberOfLines={1}>
            {task.notes}
          </Text>
        ) : null}
        <Text style={styles.meta} numberOfLines={1}>
          <Text style={{ color: CONTEXT_COLORS[task.context], fontWeight: '600' }}>
            {CONTEXT_LABELS[task.context]}
          </Text>
          {` · ${formatMinutes(task.effort_minutes)}`}
          {task.priority === 'urgent' || task.priority === 'high'
            ? ` · ${PRIORITY_LABELS[task.priority]}`
            : ''}
          {goalTitle ? ` · ${goalTitle}` : ''}
        </Text>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: 17,
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
    color: colors.secondary,
    fontSize: 13,
    marginTop: 2,
  },
});
