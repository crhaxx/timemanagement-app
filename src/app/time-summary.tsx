import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  Caption,
  Chip,
  EmptyState,
  ErrorBanner,
  ProgressBar,
  SheetHeader,
  ui,
} from '@/components/ui';
import { colors } from '@/constants/colors';
import { formatMinutes } from '@/constants/labels';
import { TIME_ENTRY_COLUMNS } from '@/lib/data';
import { localDateISO } from '@/lib/dates';
import { contextMeta, useFocusAreas } from '@/lib/focus-areas';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import {
  firstDayOfMonth,
  firstDayOfYear,
  monthEndExclusive,
  summarizeTimeByArea,
  yearEndExclusive,
} from '@/lib/time-entries';
import type { TimeEntry } from '@/types/database';

type Range = 'month' | 'year';

export default function TimeSummarySheet() {
  const { areas } = useFocusAreas();
  const [range, setRange] = useState<Range>('month');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(supabase !== null);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  const from = range === 'month' ? firstDayOfMonth(localDateISO()) : firstDayOfYear(localDateISO());

  useFocusEffect(
    useCallback(() => {
      if (!supabase) return;
      const today = localDateISO();
      const start = range === 'month' ? firstDayOfMonth(today) : firstDayOfYear(today);
      const end = range === 'month' ? monthEndExclusive(start) : yearEndExclusive(start);
      void supabase
        .from('time_entries')
        .select(TIME_ENTRY_COLUMNS)
        .gte('entry_date', start)
        .lt('entry_date', end)
        .order('entry_date', { ascending: true })
        .then(({ data, error: queryError }) => {
          if (queryError) setError(queryError.message);
          else {
            setEntries(data ?? []);
            setError(null);
          }
          setLoading(false);
        });
    }, [range]),
  );

  const byArea = useMemo(() => summarizeTimeByArea(entries, areas), [entries, areas]);
  const totals = useMemo(() => {
    const actual = entries.reduce((sum, entry) => sum + entry.duration_minutes, 0);
    const planned = entries.reduce((sum, entry) => sum + (entry.planned_minutes ?? 0), 0);
    return { actual, planned };
  }, [entries]);

  const periodLabel =
    range === 'month'
      ? new Date(`${from}T12:00:00`).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })
      : from.slice(0, 4);

  return (
    <View style={ui.screen}>
      <SheetHeader title="Plán vs. realita" cancelLabel="Zavřít" onCancel={() => router.back()} />
      <ScrollView contentContainerStyle={ui.sheetContent}>
        <View style={styles.filters}>
          <Chip label="Měsíc" selected={range === 'month'} color={colors.time} flat onPress={() => setRange('month')} />
          <Chip label="Rok" selected={range === 'year'} color={colors.time} flat onPress={() => setRange('year')} />
        </View>

        <Caption style={styles.period}>{periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)}</Caption>
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        {loading ? (
          <ActivityIndicator color={colors.muted} />
        ) : entries.length === 0 ? (
          <EmptyState
            icon="time"
            color={colors.time}
            title="Zatím bez dat"
            message="Až budou záznamy skutečného času, uvidíš tady plán proti realitě po oblastech."
            actionTitle="Zapsat dnešek"
            onAction={() => router.replace('/time-review')}
          />
        ) : (
          <>
            <Card style={styles.hero}>
              <Text style={styles.heroActual}>{formatMinutes(totals.actual)}</Text>
              <Caption>
                skutečnost
                {totals.planned > 0 ? ` · plán ${formatMinutes(totals.planned)}` : ''}
              </Caption>
              {totals.planned > 0 ? (
                <ProgressBar
                  value={totals.actual / Math.max(totals.planned, 1)}
                  color={totals.actual >= totals.planned ? colors.success : colors.time}
                />
              ) : null}
            </Card>

            {byArea.map((area) => {
              const focus = area.focusAreaId
                ? areas.find((row) => row.id === area.focusAreaId)
                : null;
              const color = area.color?.startsWith('#')
                ? area.color
                : focus
                  ? contextMeta(focus.slug, areas).color
                  : colors.time;
              const weeklyTarget = focus?.weekly_target_hours;
              const periodTargetMinutes =
                weeklyTarget != null
                  ? Math.round(weeklyTarget * 60 * (range === 'month' ? 4.345 : 52))
                  : null;
              const ratio =
                area.plannedMinutes > 0
                  ? area.actualMinutes / area.plannedMinutes
                  : periodTargetMinutes
                    ? area.actualMinutes / periodTargetMinutes
                    : null;

              return (
                <Card key={area.focusAreaId ?? 'none'} style={styles.areaCard}>
                  <View style={styles.areaHead}>
                    <View style={[styles.dot, { backgroundColor: color }]} />
                    <Text style={ui.title}>{area.label}</Text>
                  </View>
                  <Text style={styles.areaActual}>{formatMinutes(area.actualMinutes)}</Text>
                  <Caption>
                    {area.plannedMinutes > 0
                      ? `plán ${formatMinutes(area.plannedMinutes)}`
                      : periodTargetMinutes
                        ? `cíl ~${formatMinutes(periodTargetMinutes)}`
                        : 'bez plánu'}
                  </Caption>
                  {ratio !== null ? <ProgressBar value={ratio} color={color} /> : null}
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  period: {
    paddingHorizontal: 4,
    textTransform: 'capitalize',
  },
  hero: {
    padding: 18,
    gap: 8,
  },
  heroActual: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  areaCard: {
    padding: 16,
    gap: 8,
  },
  areaHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  areaActual: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
