import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { Card, ChoiceGroup, ErrorBanner, SheetHeader, ui } from '@/components/ui';
import { colors } from '@/constants/colors';
import {
  CONTEXT_COLORS,
  CONTEXT_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  formatMinutes,
} from '@/constants/labels';
import { GOAL_COLUMNS } from '@/lib/data';
import { haptic } from '@/lib/haptics';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import {
  EFFORT_MINUTES,
  TASK_CONTEXTS,
  TASK_PRIORITIES,
  type EffortMinutes,
  type Goal,
  type TaskContext,
  type TaskPriority,
} from '@/types/database';

export default function NewTaskSheet() {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [context, setContext] = useState<TaskContext>('osobni');
  const [effort, setEffort] = useState<EffortMinutes>(15);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [goalId, setGoalId] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);

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
    if (!supabase) {
      setError(supabaseConfigError);
      return;
    }

    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('tasks').insert({
      title: trimmed,
      notes: notes.trim() || null,
      context,
      effort_minutes: effort,
      priority,
      goal_id: goalId || null,
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
          <View style={{ padding: 16, gap: 12 }}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Co je potřeba udělat?"
              placeholderTextColor={colors.muted}
              style={[ui.input, { fontSize: 20, fontWeight: '600' }]}
              autoFocus
              returnKeyType="next"
            />
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Poznámka"
              placeholderTextColor={colors.muted}
              style={[ui.input, { minHeight: 56, textAlignVertical: 'top', color: colors.secondary }]}
              multiline
            />
          </View>
        </Card>

        <ChoiceGroup
          label="Kontext"
          value={context}
          options={TASK_CONTEXTS.map((value) => ({
            value,
            label: CONTEXT_LABELS[value],
            color: CONTEXT_COLORS[value],
          }))}
          onChange={setContext}
        />
        <ChoiceGroup
          label="Odhad času"
          value={effort}
          options={EFFORT_MINUTES.map((value) => ({ value, label: formatMinutes(value) }))}
          onChange={setEffort}
        />
        <ChoiceGroup
          label="Priorita"
          value={priority}
          options={TASK_PRIORITIES.map((value) => ({
            value,
            label: PRIORITY_LABELS[value],
            color: PRIORITY_COLORS[value],
          }))}
          onChange={setPriority}
        />
        {goals.length > 0 ? (
          <ChoiceGroup
            label="Cíl"
            value={goalId}
            options={[
              { value: '', label: 'Bez cíle' },
              ...goals.map((goal) => ({ value: goal.id, label: goal.title, color: colors.goal })),
            ]}
            onChange={setGoalId}
          />
        ) : null}

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      </ScrollView>
    </View>
  );
}
