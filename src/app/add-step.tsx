import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { EffortPicker } from '@/components/effort-picker';
import { Card, Caption, ChoiceGroup, ErrorBanner, Eyebrow, SheetHeader, ui } from '@/components/ui';
import { colors } from '@/constants/colors';
import { contextMeta, useFocusAreas } from '@/lib/focus-areas';
import { haptic } from '@/lib/haptics';
import { supabase, supabaseConfigError } from '@/lib/supabase';

export default function AddStepSheet() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const [goalTitle, setGoalTitle] = useState('');
  const [title, setTitle] = useState('');
  const { areas, refresh } = useFocusAreas();
  const [context, setContext] = useState('');
  const [effort, setEffort] = useState<number | null>(15);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  const selectedContext = areas.some((area) => area.slug === context) ? context : (areas[0]?.slug ?? '');

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

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
    if (!trimmed || !supabase || !goalId || !selectedContext) return;
    if (!effort) {
      setError('Napiš odhad času, třeba 45 min nebo 1 h 30 min.');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('tasks').insert({
      title: trimmed,
      context: selectedContext,
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
          value={selectedContext}
          options={areas.map((area) => {
            const meta = contextMeta(area.slug, areas);
            return { value: area.slug, label: meta.label, color: meta.color };
          })}
          onChange={setContext}
        />
        <View style={{ gap: 8 }}>
          <Eyebrow>Odhad času</Eyebrow>
          <EffortPicker value={effort} onChange={setEffort} />
        </View>
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      </ScrollView>
    </View>
  );
}
