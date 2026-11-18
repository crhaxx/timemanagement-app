import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { Card, Caption, ChoiceGroup, ErrorBanner, SheetHeader, ui } from '@/components/ui';
import { colors } from '@/constants/colors';
import { CONTEXT_COLORS, CONTEXT_LABELS, formatMinutes } from '@/constants/labels';
import { haptic } from '@/lib/haptics';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import { EFFORT_MINUTES, TASK_CONTEXTS, type EffortMinutes, type TaskContext } from '@/types/database';

export default function AddStepSheet() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const [goalTitle, setGoalTitle] = useState('');
  const [title, setTitle] = useState('');
  const [context, setContext] = useState<TaskContext>('osobni');
  const [effort, setEffort] = useState<EffortMinutes>(15);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  useEffect(() => {
    if (!supabase || !goalId) return;
    let cancelled = false;
    void supabase
      .from('goals')
      .select('title')
      .eq('id', goalId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) setGoalTitle(data.title);
      });
    return () => {
      cancelled = true;
    };
  }, [goalId]);

  async function save() {
    const trimmed = title.trim();
    if (!trimmed || !supabase || !goalId) return;
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('tasks').insert({
      title: trimmed,
      context,
      effort_minutes: effort,
      priority: 'medium',
      goal_id: goalId,
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
        title="Další krok"
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
        automaticallyAdjustKeyboardInsets>
        <Card>
          <View style={{ padding: 16, gap: 6 }}>
            {goalTitle ? <Caption numberOfLines={2}>{goalTitle}</Caption> : null}
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Co uděláš jako první?"
              placeholderTextColor={colors.muted}
              style={[ui.input, { fontSize: 20, fontWeight: '600' }]}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => {
                void save();
              }}
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
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      </ScrollView>
    </View>
  );
}
