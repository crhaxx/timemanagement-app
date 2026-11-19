import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SymbolIcon } from '@/components/symbol-icon';
import {
  Card,
  Caption,
  Chip,
  EmptyState,
  ErrorBanner,
  Pill,
  PrimaryButton,
  Row,
  SectionHeader,
  SheetHeader,
  ui,
} from '@/components/ui';
import { colors } from '@/constants/colors';
import { INBOX_KIND_LABELS, INBOX_STATUS_LABELS } from '@/constants/labels';
import { showActions } from '@/lib/actions';
import { INBOX_COLUMNS } from '@/lib/data';
import { useFocusAreas } from '@/lib/focus-areas';
import { haptic } from '@/lib/haptics';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { InboxItem } from '@/types/database';

type Filter = 'new' | 'someday';

export default function InboxSheet() {
  const { areas } = useFocusAreas();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [filter, setFilter] = useState<Filter>('new');
  const [loading, setLoading] = useState(supabase !== null);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error: queryError } = await supabase
      .from('inbox_items')
      .select(INBOX_COLUMNS)
      .in('status', ['new', 'someday'])
      .order('created_at', { ascending: false });
    if (queryError) setError(queryError.message);
    else {
      setItems(data ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const visible = useMemo(() => items.filter((item) => item.status === filter), [items, filter]);
  const areaName = useMemo(() => new Map(areas.map((area) => [area.id, area.name])), [areas]);
  const defaultContext = areas[0]?.slug ?? 'osobni';
  const newCount = items.filter((item) => item.status === 'new').length;
  const somedayCount = items.filter((item) => item.status === 'someday').length;

  async function convertToTask(item: InboxItem) {
    if (!supabase) return;
    const area = item.focus_area_id ? areas.find((row) => row.id === item.focus_area_id) : null;
    const context = area?.slug ?? defaultContext;
    const trimmed = item.content.trim();

    const { data: task, error: insertError } = await supabase
      .from('tasks')
      .insert({
        title: trimmed.slice(0, 200),
        notes: trimmed.length > 200 ? trimmed : null,
        context,
        effort_minutes: 30,
        priority: 'medium',
        status: 'backlog',
        focus_area_id: item.focus_area_id,
      })
      .select('id')
      .single();

    if (insertError || !task) {
      setError(insertError?.message ?? 'Úkol se nepodařilo vytvořit.');
      return;
    }

    const { error: updateError } = await supabase
      .from('inbox_items')
      .update({
        status: 'converted',
        converted_task_id: task.id,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    haptic.success();
    setItems((current) => current.filter((row) => row.id !== item.id));
  }

  async function deferItem(item: InboxItem) {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from('inbox_items')
      .update({
        status: 'someday',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    haptic.light();
    setItems((current) => current.map((row) => (row.id === item.id ? { ...row, status: 'someday' } : row)));
  }

  async function restoreItem(item: InboxItem) {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from('inbox_items')
      .update({
        status: 'new',
        processed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    haptic.light();
    setItems((current) => current.map((row) => (row.id === item.id ? { ...row, status: 'new' } : row)));
  }

  async function discardItem(item: InboxItem) {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from('inbox_items')
      .update({
        status: 'discarded',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    haptic.warning();
    setItems((current) => current.filter((row) => row.id !== item.id));
  }

  function openActions(item: InboxItem) {
    showActions(item.content.slice(0, 48), [
      {
        label: 'Převést na úkol',
        onPress: () => {
          void convertToTask(item);
        },
      },
      {
        label: item.status === 'someday' ? 'Vrátit do fronty' : 'Odložit na někdy',
        onPress: () => {
          if (item.status === 'someday') void restoreItem(item);
          else void deferItem(item);
        },
      },
      {
        label: 'Zahodit',
        destructive: true,
        onPress: () => {
          void discardItem(item);
        },
      },
    ]);
  }

  return (
    <View style={ui.screen}>
      <SheetHeader
        title="Schránka"
        cancelLabel="Zavřít"
        onCancel={() => router.back()}
        saveLabel="Nápad"
        onSave={() => router.push('/new-inbox')}
        canSave
      />
      <ScrollView contentContainerStyle={ui.sheetContent}>
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        <View style={styles.filters}>
          <Chip
            label={`Nové · ${newCount}`}
            selected={filter === 'new'}
            color={colors.inbox}
            flat
            onPress={() => setFilter('new')}
          />
          <Chip
            label={`Někdy · ${somedayCount}`}
            selected={filter === 'someday'}
            color={colors.inbox}
            flat
            onPress={() => setFilter('someday')}
          />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.muted} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="inbox"
            color={colors.inbox}
            title={filter === 'new' ? 'Schránka je prázdná' : 'Nic odloženo'}
            message={
              filter === 'new'
                ? 'Až tě napadne něco drobného, hoď to sem — převod na úkol zvládneš později.'
                : 'Odložené nápady se objeví tady.'
            }
            actionTitle="Přidat nápad"
            onAction={() => router.push('/new-inbox')}
          />
        ) : (
          <>
            <SectionHeader title={filter === 'new' ? 'Ke zpracování' : 'Někdy'} />
            <Card clip>
              {visible.map((item, index) => (
                <Row
                  key={item.id}
                  last={index === visible.length - 1}
                  onPress={() => openActions(item)}
                  onLongPress={() => openActions(item)}
                  accessibilityLabel={item.content}>
                  <View style={ui.flex}>
                    <Text style={ui.title} numberOfLines={3}>
                      {item.content}
                    </Text>
                    <View style={styles.meta}>
                      <Pill label={INBOX_KIND_LABELS[item.kind]} color={colors.inbox} />
                      {item.focus_area_id && areaName.get(item.focus_area_id) ? (
                        <Caption>{areaName.get(item.focus_area_id)}</Caption>
                      ) : null}
                      <Caption>{INBOX_STATUS_LABELS[item.status]}</Caption>
                    </View>
                  </View>
                  <SymbolIcon name="chevronRight" color={colors.tertiary} size={13} />
                </Row>
              ))}
            </Card>

            {visible[0] ? (
              <View style={styles.quickActions}>
                <PrimaryButton
                  title="Převést první na úkol"
                  color={colors.task}
                  onPress={() => {
                    void convertToTask(visible[0]);
                  }}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (visible[0].status === 'someday') void restoreItem(visible[0]);
                    else void deferItem(visible[0]);
                  }}
                  style={styles.secondary}>
                  <Text style={styles.secondaryText}>
                    {visible[0].status === 'someday' ? 'Vrátit první do fronty' : 'Odložit první'}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: {
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
  quickActions: {
    gap: 10,
  },
  secondary: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryText: {
    color: colors.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
});
