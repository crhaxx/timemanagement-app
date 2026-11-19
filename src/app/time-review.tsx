import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EffortPicker } from '@/components/effort-picker';
import { SymbolIcon } from '@/components/symbol-icon';
import {
  Card,
  Caption,
  Chip,
  EmptyState,
  ErrorBanner,
  Pill,
  PrimaryButton,
  ProgressBar,
  Row,
  SectionHeader,
  SheetHeader,
  TextButton,
  ui,
} from '@/components/ui';
import { colors } from '@/constants/colors';
import { TIME_SOURCE_LABELS, formatMinutes } from '@/constants/labels';
import { confirmDestructive } from '@/lib/actions';
import { TIME_ENTRY_COLUMNS } from '@/lib/data';
import { formatJournalDate, localDateISO } from '@/lib/dates';
import { contextMeta, useFocusAreas } from '@/lib/focus-areas';
import { haptic } from '@/lib/haptics';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import { summarizeTimeByArea } from '@/lib/time-entries';
import type { TimeEntry } from '@/types/database';

export default function TimeReviewSheet() {
  const params = useLocalSearchParams<{ date?: string }>();
  const entryDate =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : localDateISO();
  const { areas } = useFocusAreas();

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(supabase !== null);
  const [error, setError] = useState<string | null>(supabaseConfigError);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMinutes, setEditMinutes] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState<number | null>(30);
  const [focusAreaId, setFocusAreaId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error: queryError } = await supabase
      .from('time_entries')
      .select(TIME_ENTRY_COLUMNS)
      .eq('entry_date', entryDate)
      .order('created_at', { ascending: true });
    if (queryError) setError(queryError.message);
    else {
      setEntries(data ?? []);
      setError(null);
    }
    setLoading(false);
  }, [entryDate]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const totals = useMemo(() => {
    const actual = entries.reduce((sum, entry) => sum + entry.duration_minutes, 0);
    const planned = entries.reduce((sum, entry) => sum + (entry.planned_minutes ?? 0), 0);
    return { actual, planned };
  }, [entries]);

  const byArea = useMemo(() => summarizeTimeByArea(entries, areas), [entries, areas]);
  const areaById = useMemo(() => new Map(areas.map((area) => [area.id, area])), [areas]);

  async function updateDuration(entry: TimeEntry, nextMinutes: number) {
    if (!supabase || nextMinutes < 1) return;
    const { data, error: updateError } = await supabase
      .from('time_entries')
      .update({ duration_minutes: nextMinutes, updated_at: new Date().toISOString() })
      .eq('id', entry.id)
      .select(TIME_ENTRY_COLUMNS)
      .single();
    if (updateError) {
      setError(updateError.message);
      return;
    }
    haptic.light();
    if (data) {
      setEntries((current) => current.map((row) => (row.id === entry.id ? data : row)));
    }
  }

  function startEdit(entry: TimeEntry) {
    setAdding(false);
    setEditingId(entry.id);
    setEditMinutes(entry.duration_minutes);
  }

  async function saveEdit(entry: TimeEntry) {
    if (!editMinutes) return;
    await updateDuration(entry, editMinutes);
    setEditingId(null);
    setEditMinutes(null);
  }

  async function addEntry() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Napiš, na čem jsi pracoval.');
      return;
    }
    if (!minutes) {
      setError('Zadej délku.');
      return;
    }
    if (!supabase) {
      setError(supabaseConfigError);
      return;
    }

    setSaving(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from('time_entries')
      .insert({
        entry_date: entryDate,
        title: trimmed,
        duration_minutes: minutes,
        planned_minutes: minutes,
        focus_area_id: focusAreaId,
        source: 'manual',
      })
      .select(TIME_ENTRY_COLUMNS)
      .single();
    setSaving(false);

    if (insertError) {
      haptic.error();
      setError(insertError.message);
      return;
    }

    haptic.success();
    if (data) setEntries((current) => [...current, data]);
    setTitle('');
    setMinutes(30);
    setFocusAreaId(null);
    setAdding(false);
  }

  function removeEntry(entry: TimeEntry) {
    confirmDestructive('Smazat záznam', `Smazat „${entry.title}“?`, 'Smazat', () => {
      void (async () => {
        if (!supabase) return;
        const { error: deleteError } = await supabase.from('time_entries').delete().eq('id', entry.id);
        if (deleteError) {
          setError(deleteError.message);
          return;
        }
        haptic.warning();
        setEntries((current) => current.filter((row) => row.id !== entry.id));
      })();
    });
  }

  return (
    <View style={ui.screen}>
      <SheetHeader
        title="Skutečný čas"
        cancelLabel="Zavřít"
        onCancel={() => router.back()}
        saveLabel="Souhrn"
        onSave={() => router.push('/time-summary')}
        canSave
      />
      <ScrollView
        contentContainerStyle={ui.sheetContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets>
        <Caption>{formatJournalDate(entryDate)}</Caption>
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        {loading ? (
          <ActivityIndicator color={colors.muted} />
        ) : (
          <>
            <Card style={styles.summary}>
              <Text style={styles.summaryTitle}>
                {formatMinutes(totals.actual)}
                {totals.planned > 0 ? ` / plán ${formatMinutes(totals.planned)}` : ''}
              </Text>
              {totals.planned > 0 ? (
                <ProgressBar
                  value={totals.actual / Math.max(totals.planned, 1)}
                  color={totals.actual >= totals.planned ? colors.success : colors.time}
                />
              ) : null}
              <Caption>
                {entries.length === 0
                  ? 'Zatím žádné záznamy za den.'
                  : 'Potvrď odhad, nebo uprav minuty klepnutím.'}
              </Caption>
            </Card>

            {byArea.length > 0 ? (
              <View style={styles.areaRow}>
                {byArea.map((area) => (
                  <Pill
                    key={area.focusAreaId ?? 'none'}
                    label={`${area.label} · ${formatMinutes(area.actualMinutes)}`}
                    color={area.color?.startsWith('#') ? area.color : colors.time}
                  />
                ))}
              </View>
            ) : null}

            {entries.length === 0 && !adding ? (
              <EmptyState
                icon="time"
                color={colors.time}
                title="Žádný čas"
                message="Až AI nebo ty zapíšeš odhad z kalendáře, upravíš ho tady. Nebo přidej ručně."
                actionTitle="Přidat záznam"
                onAction={() => setAdding(true)}
              />
            ) : (
              <>
                <SectionHeader
                  title="Záznamy"
                  action={adding ? undefined : 'Přidat'}
                  onAction={adding ? undefined : () => setAdding(true)}
                />
                <Card clip>
                  {entries.map((entry, index) => {
                    const area = entry.focus_area_id ? areaById.get(entry.focus_area_id) : null;
                    const areaColor = area?.color?.startsWith('#')
                      ? area.color
                      : area
                        ? contextMeta(area.slug, areas).color
                        : colors.time;
                    const isEditing = editingId === entry.id;
                    if (isEditing) {
                      return (
                        <View
                          key={entry.id}
                          style={[
                            styles.editBlock,
                            index < entries.length - 1 || adding ? styles.editBlockBorder : null,
                          ]}>
                          <Text style={ui.title}>{entry.title}</Text>
                          <EffortPicker value={editMinutes} onChange={setEditMinutes} />
                          <View style={styles.editActions}>
                            <TextButton
                              title="Zrušit"
                              color={colors.secondary}
                              onPress={() => {
                                setEditingId(null);
                                setEditMinutes(null);
                              }}
                            />
                            <TextButton
                              title="Uložit"
                              onPress={() => {
                                void saveEdit(entry);
                              }}
                              disabled={!editMinutes}
                            />
                            <TextButton
                              title="Smazat"
                              color={colors.danger}
                              onPress={() => removeEntry(entry)}
                            />
                          </View>
                        </View>
                      );
                    }
                    return (
                      <Row
                        key={entry.id}
                        last={index === entries.length - 1 && !adding}
                        onPress={() => startEdit(entry)}
                        onLongPress={() => removeEntry(entry)}
                        accessibilityLabel={entry.title}>
                        <View style={ui.flex}>
                          <Text style={ui.title}>{entry.title}</Text>
                          <View style={styles.meta}>
                            <Pill label={formatMinutes(entry.duration_minutes)} color={areaColor} />
                            {entry.planned_minutes != null ? (
                              <Caption>plán {formatMinutes(entry.planned_minutes)}</Caption>
                            ) : null}
                            <Caption>{TIME_SOURCE_LABELS[entry.source]}</Caption>
                            {area ? <Caption>{area.name}</Caption> : null}
                          </View>
                        </View>
                        <SymbolIcon name="pencil" color={colors.tertiary} size={16} />
                      </Row>
                    );
                  })}
                </Card>
              </>
            )}

            {adding ? (
              <Card style={styles.addCard}>
                <Text style={ui.title}>Nový záznam</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Na čem jsi byl?"
                  placeholderTextColor={colors.muted}
                  style={styles.titleInput}
                  autoFocus
                />
                <EffortPicker value={minutes} onChange={setMinutes} />
                <View style={styles.chips}>
                  <Chip
                    label="Bez oblasti"
                    selected={focusAreaId === null}
                    flat
                    onPress={() => setFocusAreaId(null)}
                  />
                  {areas.map((area) => {
                    const meta = contextMeta(area.slug, areas);
                    return (
                      <Chip
                        key={area.id}
                        label={meta.label}
                        color={meta.color}
                        selected={focusAreaId === area.id}
                        flat
                        onPress={() => setFocusAreaId(area.id)}
                      />
                    );
                  })}
                </View>
                <PrimaryButton
                  title="Uložit záznam"
                  color={colors.time}
                  loading={saving}
                  disabled={!title.trim() || !minutes}
                  onPress={() => {
                    void addEntry();
                  }}
                />
                <Pressable onPress={() => setAdding(false)} style={styles.cancelAdd}>
                  <Text style={styles.cancelAddText}>Zrušit</Text>
                </Pressable>
              </Card>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/time-summary')}
              style={styles.summaryLink}>
              <Text style={styles.summaryLinkText}>Měsíční plán vs. realita</Text>
              <SymbolIcon name="chevronRight" color={colors.accent} size={14} />
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    padding: 16,
    gap: 10,
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  areaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  editBlock: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  editBlockBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addCard: {
    padding: 16,
    gap: 12,
  },
  titleInput: {
    color: colors.text,
    fontSize: 17,
    paddingVertical: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cancelAdd: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  cancelAddText: {
    color: colors.secondary,
    fontSize: 16,
  },
  summaryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  summaryLinkText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
});
