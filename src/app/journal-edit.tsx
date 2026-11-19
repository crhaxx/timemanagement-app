import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ChoiceGroup, ErrorBanner, SheetHeader, TextButton, ui } from '@/components/ui';
import { colors } from '@/constants/colors';
import { QUALITY_LABELS } from '@/constants/labels';
import { confirmDestructive } from '@/lib/actions';
import { JOURNAL_COLUMNS } from '@/lib/data';
import { formatJournalDate, localDateISO } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import { SCALE_1_TO_5 } from '@/types/database';

export default function JournalEditSheet() {
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : localDateISO();

  const [entryId, setEntryId] = useState<string | null>(null);
  const [original, setOriginal] = useState('');
  const [originalEnergy, setOriginalEnergy] = useState<number | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    void supabase
      .from('journal_entries')
      .select(JOURNAL_COLUMNS)
      .eq('entry_date', date)
      .maybeSingle()
      .then(({ data, error: queryError }) => {
        if (cancelled) return;
        if (queryError) {
          setError(queryError.message);
        } else if (data) {
          setEntryId(data.id);
          setOriginal(data.summary);
          setOriginalEnergy(data.energy);
          setEnergy(data.energy);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const value = draft ?? original;
  const trimmed = value.trim();
  const canSave =
    trimmed.length > 0 && (trimmed !== original.trim() || energy !== originalEnergy);

  async function save() {
    if (!supabase) {
      setError(supabaseConfigError);
      return;
    }
    setSaving(true);
    setError(null);
    const { error: upsertError } = await supabase.from('journal_entries').upsert(
      {
        entry_date: date,
        summary: trimmed,
        energy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'entry_date' },
    );
    setSaving(false);
    if (upsertError) {
      haptic.error();
      setError(upsertError.message);
      return;
    }
    haptic.success();
    router.back();
  }

  function remove() {
    if (!entryId) return;
    confirmDestructive('Smazat zápis', `Opravdu smazat zápis z ${formatJournalDate(date)}?`, 'Smazat', () => {
      void (async () => {
        if (!supabase) return;
        const { error: deleteError } = await supabase.from('journal_entries').delete().eq('id', entryId);
        if (deleteError) {
          setError(deleteError.message);
          return;
        }
        haptic.warning();
        router.back();
      })();
    });
  }

  return (
    <View style={ui.screen}>
      <SheetHeader
        title={formatJournalDate(date)}
        onCancel={() => router.back()}
        onSave={() => {
          void save();
        }}
        canSave={canSave}
        saving={saving}
      />
      <ScrollView
        contentContainerStyle={ui.sheetContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets>
        <TextInput
          value={value}
          onChangeText={setDraft}
          placeholder="Co se dnes stalo? Jaký to byl den?"
          placeholderTextColor={colors.muted}
          style={styles.editor}
          multiline
          autoFocus
          textAlignVertical="top"
        />
        <ChoiceGroup
          label="Energie"
          options={SCALE_1_TO_5.map((value) => ({
            value,
            label: `${value} · ${QUALITY_LABELS[value]}`,
            color: colors.journal,
          }))}
          value={(energy ?? 3) as (typeof SCALE_1_TO_5)[number]}
          onChange={(next) => setEnergy(next)}
        />
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        {entryId ? (
          <View style={styles.delete}>
            <TextButton title="Smazat zápis" color={colors.danger} onPress={remove} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  editor: {
    color: colors.text,
    fontSize: 19,
    lineHeight: 28,
    minHeight: 240,
    paddingHorizontal: 4,
  },
  delete: {
    alignItems: 'center',
    paddingTop: 8,
  },
});
