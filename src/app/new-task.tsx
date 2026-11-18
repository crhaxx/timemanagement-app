import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Calendar } from '@/components/calendar';
import { EffortPicker } from '@/components/effort-picker';
import type { AppIconName } from '@/components/symbol-icon';
import { Caption, Card, ErrorBanner, PrimaryButton, SheetHeader, TextButton, TintIcon, ui } from '@/components/ui';
import { colors } from '@/constants/colors';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/constants/labels';
import { GOAL_COLUMNS } from '@/lib/data';
import { contextMeta, useFocusAreas } from '@/lib/focus-areas';
import { formatTaskHeading } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import { TASK_PRIORITIES, type Goal, type TaskPriority } from '@/types/database';

export default function NewTaskSheet() {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const { areas, refresh } = useFocusAreas();
  const [context, setContext] = useState('');
  const [effort, setEffort] = useState<number | null>(15);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [goalId, setGoalId] = useState('');
  const [scheduled, setScheduled] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  const selectedContext = areas.some((area) => area.slug === context) ? context : (areas[0]?.slug ?? '');

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    void supabase
      .from('goals')
      .select(GOAL_COLUMNS)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setGoals(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Napiš, co je potřeba udělat.');
      return;
    }
    if (!selectedContext) {
      setError('Nejdřív přidej oblast, do které úkol patří.');
      return;
    }
    if (!effort) {
      setError('Napiš odhad času, třeba 45 min nebo 1 h 30 min.');
      return;
    }
    if (!supabase) {
      setError(supabaseConfigError);
      return;
    }

    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('tasks').insert({
      title: trimmed,
      notes: notes.trim() || null,
      context: selectedContext,
      effort_minutes: effort,
      priority,
      goal_id: goalId || null,
      deadline: scheduled ? `${scheduled}T12:00:00.000Z` : null,
      status: 'backlog',
    });
    setSaving(false);

    if (insertError) {
      haptic.error();
      setError(insertError.message);
      return;
    }

    haptic.success();
    router.back();
  }

  return (
    <View style={ui.screen}>
      <SheetHeader
        title="Nový úkol"
        onCancel={() => router.back()}
        onSave={() => {
          void save();
        }}
        canSave={title.trim().length > 0}
        saving={saving}
      />
      <ScrollView
        contentContainerStyle={ui.sheetContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets>
        <Card clip>
          <View style={styles.titleBlock}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Co je potřeba udělat?"
              placeholderTextColor={colors.muted}
              style={[ui.input, styles.titleInput]}
              autoFocus
              returnKeyType="next"
            />
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Poznámka"
              placeholderTextColor={colors.muted}
              style={[ui.input, styles.notesInput]}
              multiline
            />
          </View>
        </Card>

        <Card clip>
          <Field label="Kdy" icon="calendar" color={colors.accent}>
            <Text style={styles.when}>{scheduled ? formatTaskHeading(scheduled) : 'Bez data'}</Text>
            <Calendar value={scheduled} onChange={setScheduled} />
            {scheduled ? (
              <TextButton title="Bez data" color={colors.secondary} onPress={() => setScheduled('')} />
            ) : (
              <Caption>Klepni na den, nebo ho nech bez data a uděláš ho, až na něj přijde řada.</Caption>
            )}
          </Field>
          <Field label="Kontext" icon="list" color={colors.goal}>
            {areas.length > 0 ? (
              <View style={styles.options}>
                {areas.map((area) => {
                  const meta = contextMeta(area.slug, areas);
                  return (
                    <Option
                      key={area.slug}
                      label={meta.label}
                      color={meta.color}
                      selected={selectedContext === area.slug}
                      onPress={() => setContext(area.slug)}
                    />
                  );
                })}
              </View>
            ) : (
              <Caption>Zatím tu není žádná oblast.</Caption>
            )}
          </Field>
          <Field label="Odhad času" icon="time" color={colors.success}>
            <EffortPicker value={effort} onChange={setEffort} />
          </Field>
          <Field label="Priorita" icon="flame" color={colors.high} last={goals.length === 0}>
            <Segmented
              options={TASK_PRIORITIES.map((value) => ({
                value,
                label: PRIORITY_LABELS[value],
                color: PRIORITY_COLORS[value],
              }))}
              value={priority}
              onChange={setPriority}
            />
          </Field>
          {goals.length > 0 ? (
            <Field label="Cíl" icon="goal" color={colors.goal} last>
              <View style={styles.options}>
                <Option label="Bez cíle" selected={goalId === ''} onPress={() => setGoalId('')} />
                {goals.map((goal) => (
                  <Option
                    key={goal.id}
                    label={goal.title}
                    color={colors.goal}
                    selected={goalId === goal.id}
                    onPress={() => setGoalId(goal.id)}
                  />
                ))}
              </View>
            </Field>
          ) : null}
        </Card>

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        <PrimaryButton
          title="Přidat úkol"
          onPress={() => {
            void save();
          }}
          disabled={title.trim().length === 0}
          loading={saving}
        />
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  icon,
  color,
  last,
  children,
}: {
  label: string;
  icon: AppIconName;
  color: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[styles.field, !last && styles.fieldBorder]}>
      <View style={styles.fieldHeader}>
        <TintIcon name={icon} color={color} size={26} />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; color?: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              haptic.tap();
              onChange(option.value);
            }}
            style={[styles.segment, selected && styles.segmentSelected]}>
            {option.color ? <View style={[styles.dot, { backgroundColor: option.color }]} /> : null}
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Option({
  label,
  selected,
  color = colors.accent,
  onPress,
}: {
  label: string;
  selected: boolean;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={[styles.option, selected && { backgroundColor: color }]}>
      {color !== colors.accent && !selected ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text style={[styles.optionText, selected && styles.optionTextSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  titleBlock: {
    padding: 16,
    gap: 12,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
  },
  notesInput: {
    minHeight: 56,
    textAlignVertical: 'top',
    color: colors.secondary,
  },
  field: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  fieldBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.fill,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 3,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  segmentSelected: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  segmentTextSelected: {
    color: colors.text,
    fontWeight: '600',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.fill,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  optionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: colors.accentText,
    fontWeight: '600',
  },
  when: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
});
