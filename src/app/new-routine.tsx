import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { QuoteBlock } from '@/components/routines/quote-block';
import {
  newRoutineDraft,
  RoutineForm,
  routineDraftValues,
} from '@/components/routines/routine-form';
import { ErrorBanner, SheetHeader, ui } from '@/components/ui';
import { GOAL_COLUMNS } from '@/lib/data';
import { localDateISO } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { Goal } from '@/types/database';

export default function NewRoutineSheet() {
  const [draft, setDraft] = useState(newRoutineDraft);
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
    const result = routineDraftValues(draft);
    if (!result.values) {
      setError(result.error);
      return;
    }
    if (!supabase) {
      setError(supabaseConfigError);
      return;
    }

    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('routines').insert({
      ...result.values,
      status: 'active',
      updated_at: new Date().toISOString(),
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
        title="Nová rutina"
        onCancel={() => router.back()}
        onSave={() => {
          void save();
        }}
        canSave={draft.title.trim().length > 0}
        saving={saving}
      />
      <ScrollView
        contentContainerStyle={ui.sheetContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets>
        <RoutineForm
          draft={draft}
          goals={goals}
          onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
          autoFocus
        />
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        <View style={styles.quote}>
          <QuoteBlock mood="build" seed={localDateISO()} size="small" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  quote: {
    paddingHorizontal: 4,
    paddingTop: 4,
  },
});
