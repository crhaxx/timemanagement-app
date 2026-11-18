import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Pill, PressableScale } from '@/components/ui';
import { colors, tint } from '@/constants/colors';
import { PRIORITY_COLORS, PRIORITY_LABELS, formatMinutes } from '@/constants/labels';
import { contextMeta, useFocusAreas } from '@/lib/focus-areas';
import { daysUntil, formatTaskWhen } from '@/lib/dates';
import type { Task } from '@/types/database';

type SheetProps = {
  task: Task | null;
  goalTitle?: string;
  onClose: () => void;
  onToggle: () => void;
  onDelete: () => void;
};

export function TaskSheet({ task, goalTitle, onClose, onToggle, onDelete }: SheetProps) {
  return (
    <BottomSheet visible={task !== null} onClose={onClose}>
      {(dismiss) =>
        task ? (
          <TaskContent
            task={task}
            goalTitle={goalTitle}
            onClose={() => dismiss(onClose)}
            onToggle={() => dismiss(onToggle)}
            onDelete={() => dismiss(onDelete)}
          />
        ) : null
      }
    </BottomSheet>
  );
}

function TaskContent({
  task,
  goalTitle,
  onClose,
  onToggle,
  onDelete,
}: Omit<SheetProps, 'task'> & { task: Task }) {
  const [confirming, setConfirming] = useState(false);
  const done = task.status === 'done';
  const { areas } = useFocusAreas();
  const context = contextMeta(task.context, areas);
  const overdue = !done && !!task.deadline && daysUntil(task.deadline.slice(0, 10)) < 0;

  return (
    <>
      <Text style={[styles.title, done && styles.titleDone]}>{task.title}</Text>

      <View style={styles.meta}>
        <Pill label={context.label} color={context.color} />
        <Pill label={formatMinutes(task.effort_minutes)} color={colors.muted} />
        {task.deadline ? (
          <Pill label={formatTaskWhen(task.deadline)} color={overdue ? colors.danger : colors.muted} />
        ) : null}
        <Pill label={PRIORITY_LABELS[task.priority]} color={PRIORITY_COLORS[task.priority]} />
      </View>

      {task.notes ? <Text style={styles.notes}>{task.notes}</Text> : null}
      {goalTitle ? <Text style={styles.goal}>Cíl: {goalTitle}</Text> : null}

      <View style={styles.actions}>
        <PressableScale
          accessibilityRole="button"
          onPress={onToggle}
          pressedScale={0.98}
          style={[styles.button, { backgroundColor: done ? colors.accent : colors.success }]}>
          <Text style={styles.buttonText}>{done ? 'Vrátit do úkolů' : 'Hotovo'}</Text>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          onPress={() => {
            if (confirming) onDelete();
            else setConfirming(true);
          }}
          pressedScale={0.98}
          style={[
            styles.button,
            { backgroundColor: confirming ? colors.danger : tint(colors.danger, 0.12) },
          ]}>
          <Text style={[styles.buttonText, { color: confirming ? '#FFFFFF' : colors.danger }]}>
            {confirming ? 'Opravdu smazat?' : 'Smazat'}
          </Text>
        </PressableScale>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}>
          <Text style={styles.cancelText}>Zavřít</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  titleDone: {
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  notes: {
    color: colors.secondary,
    fontSize: 16,
    lineHeight: 22,
  },
  goal: {
    color: colors.secondary,
    fontSize: 14,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  button: {
    minHeight: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelText: {
    color: colors.secondary,
    fontSize: 16,
  },
});
