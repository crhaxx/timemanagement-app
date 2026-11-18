import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SymbolIcon, type AppIconName } from '@/components/symbol-icon';
import { PressableScale } from '@/components/ui';
import { colors } from '@/constants/colors';
import { CONTEXT_LABELS, formatMinutes } from '@/constants/labels';
import { formatDeadlineLabel } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import type { Goal, Task } from '@/types/database';

/** The one thing the home screen asks the user to deal with right now. */
export type Focus =
  | { kind: 'missing'; goal: Goal; position: number; total: number }
  | { kind: 'task'; task: Task; goal: Goal | null }
  | { kind: 'empty' };

// System colors as they appear on dark surfaces.
const STATUS = {
  blue: '#0A84FF',
  orange: '#FF9F0A',
  red: '#FF453A',
  green: '#30D158',
} as const;

export function FocusCard({
  focus,
  onCompleteTask,
  onAddStep,
  onNextGoal,
  onNewTask,
}: {
  focus: Focus;
  onCompleteTask: (task: Task) => Promise<boolean>;
  onAddStep: (goal: Goal) => void;
  onNextGoal: () => void;
  onNewTask: () => void;
}) {
  return (
    <View style={styles.card}>
      {focus.kind === 'missing' ? (
        <MissingStep
          key={focus.goal.id}
          goal={focus.goal}
          position={focus.position}
          total={focus.total}
          onAdd={onAddStep}
          onNext={onNextGoal}
        />
      ) : focus.kind === 'task' ? (
        <NextTask key={focus.task.id} task={focus.task} goal={focus.goal} onComplete={onCompleteTask} />
      ) : (
        <>
          <Label color={STATUS.green}>Vše hotovo</Label>
          <Text style={styles.title}>Žádný otevřený úkol</Text>
          <Text style={styles.detail}>Zapiš, co máš v hlavě, ať to tam nezůstane.</Text>
          <View style={styles.footer}>
            <PillButton icon="add" title="Nový úkol" onPress={onNewTask} />
          </View>
        </>
      )}
    </View>
  );
}

function Label({
  color,
  children,
  trailing,
}: {
  color: string;
  children: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.labelRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.label} numberOfLines={1}>
        {children}
      </Text>
      {trailing}
    </View>
  );
}

function PillButton({
  icon,
  title,
  onPress,
  done,
}: {
  icon: AppIconName;
  title: string;
  onPress: () => void;
  done?: boolean;
}) {
  const foreground = done ? colors.inkText : colors.ink;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={done}
      onPress={onPress}
      style={[styles.pill, done && { backgroundColor: STATUS.green }]}>
      <SymbolIcon name={icon} color={foreground} size={15} weight="bold" />
      <Text style={[styles.pillText, { color: foreground }]}>{title}</Text>
    </PressableScale>
  );
}

function NextTask({
  task,
  goal,
  onComplete,
}: {
  task: Task;
  goal: Goal | null;
  onComplete: (task: Task) => Promise<boolean>;
}) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function complete() {
    if (done) return;
    setDone(true);
    haptic.success();
    // Leave the confirmation on screen for a beat before the next task takes its place.
    timer.current = setTimeout(() => {
      void onComplete(task).then((saved) => {
        if (!saved) setDone(false);
      });
    }, 380);
  }

  const base = goal ? 'Další krok' : 'Na řadě';
  const label =
    task.priority === 'urgent'
      ? `${base} · urgentní`
      : task.priority === 'high'
        ? `${base} · vysoká priorita`
        : base;
  const dot =
    task.priority === 'urgent' ? STATUS.red : task.priority === 'high' ? STATUS.orange : STATUS.blue;

  return (
    <>
      <Label color={dot}>{label}</Label>
      <Text style={styles.title} numberOfLines={3}>
        {task.title}
      </Text>
      {goal ? (
        <View style={styles.goalRow}>
          <SymbolIcon name="goal" color={colors.inkSecondary} size={13} />
          <Text style={styles.detail} numberOfLines={1}>
            {goal.title}
          </Text>
        </View>
      ) : null}
      <View style={styles.footer}>
        <PillButton icon="checkmark" title="Hotovo" onPress={complete} done={done} />
        <Text style={styles.meta} numberOfLines={1}>
          {formatMinutes(task.effort_minutes)} · {CONTEXT_LABELS[task.context]}
        </Text>
      </View>
    </>
  );
}

function MissingStep({
  goal,
  position,
  total,
  onAdd,
  onNext,
}: {
  goal: Goal;
  position: number;
  total: number;
  onAdd: (goal: Goal) => void;
  onNext: () => void;
}) {
  return (
    <>
      <Label
        color={STATUS.orange}
        trailing={
          total > 1 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Další cíl bez kroku"
              hitSlop={12}
              onPress={() => {
                haptic.tap();
                onNext();
              }}
              style={({ pressed }) => [styles.pager, pressed && styles.pressed]}>
              <Text style={styles.pagerText}>
                {position} z {total}
              </Text>
              <SymbolIcon name="chevronRight" color={colors.inkSecondary} size={11} weight="semibold" />
            </Pressable>
          ) : null
        }>
        Cíl bez dalšího kroku
      </Label>
      <Text style={styles.title} numberOfLines={3}>
        {goal.title}
      </Text>
      <Text style={styles.detail}>
        {goal.deadline ? formatDeadlineLabel(goal.deadline.slice(0, 10)).split(' · ')[0] : 'Bez termínu'}
      </Text>
      <View style={styles.footer}>
        <PillButton icon="add" title="Přidat krok" onPress={() => onAdd(goal)} />
      </View>
    </>
  );
}

const PADDING = 20;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.ink,
    borderRadius: 26,
    borderCurve: 'continuous',
    padding: PADDING,
    gap: 8,
    overflow: 'hidden',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 18,
    marginBottom: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    flex: 1,
    color: colors.inkSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pagerText: {
    color: colors.inkSecondary,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  title: {
    color: colors.inkText,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detail: {
    flexShrink: 1,
    color: colors.inkSecondary,
    fontSize: 15,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  meta: {
    flexShrink: 1,
    color: colors.inkSecondary,
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: colors.inkText,
  },
  pillText: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingLeft: 16,
    paddingRight: 6,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: colors.inkFill,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.inkText,
    fontSize: 17,
    paddingVertical: 10,
    outlineWidth: 0,
  },
  send: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inkText,
  },
  sendDisabled: {
    opacity: 0.28,
  },
  pressed: {
    opacity: 0.6,
  },
  contextScroll: {
    flexGrow: 0,
    marginHorizontal: -PADDING,
    marginTop: 4,
  },
  contexts: {
    paddingHorizontal: PADDING,
    gap: 8,
  },
  context: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 17,
    backgroundColor: colors.inkFill,
  },
  contextSelected: {
    backgroundColor: colors.inkText,
  },
  contextText: {
    color: colors.inkText,
    fontSize: 15,
    fontWeight: '500',
  },
  contextTextSelected: {
    color: colors.ink,
    fontWeight: '600',
  },
});
