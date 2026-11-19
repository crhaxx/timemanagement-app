import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SymbolIcon } from '@/components/symbol-icon';
import {
  Card,
  Caption,
  ErrorBanner,
  Pill,
  PressableScale,
  PrimaryButton,
  Row,
  SectionHeader,
  ui,
} from '@/components/ui';
import { colors, palette } from '@/constants/colors';
import {
  currentStreak,
  dayNumber,
  formatJournalDate,
  localDateISO,
  shiftDate,
  weekdayShort,
} from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { JournalEntry } from '@/types/database';

const STRIP_DAYS = 14;

function openEditor(date: string) {
  haptic.light();
  router.push({ pathname: '/journal-edit', params: { date } });
}

export default function JournalScreen() {
  const today = localDateISO();
  const [selectedDate, setSelectedDate] = useState(today);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(supabase !== null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);
  const strip = useRef<ScrollViewInstance>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error: queryError } = await supabase
      .from('journal_entries')
      .select('id, entry_date, summary, energy, mood, created_at, updated_at')
      .order('entry_date', { ascending: false });
    if (queryError) {
      setError(queryError.message);
    } else {
      setEntries(data ?? []);
      setError(null);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const days = useMemo(
    () => Array.from({ length: STRIP_DAYS }, (_, index) => shiftDate(today, index - (STRIP_DAYS - 1))),
    [today],
  );
  const dateSet = useMemo(() => new Set(entries.map((entry) => entry.entry_date)), [entries]);
  const streak = useMemo(() => currentStreak(dateSet, today), [dateSet, today]);
  const selected = entries.find((entry) => entry.entry_date === selectedDate) ?? null;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Upravit zápis"
              hitSlop={12}
              onPress={() => openEditor(selectedDate)}
              style={({ pressed }) => pressed && styles.pressed}>
              <SymbolIcon name="pencil" color={colors.accent} size={22} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={ui.screen}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={ui.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.muted}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }>
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        <ScrollView
          ref={strip}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => strip.current?.scrollToEnd({ animated: false })}
          style={styles.stripScroll}
          contentContainerStyle={styles.strip}>
          {days.map((day) => {
            const isSelected = day === selectedDate;
            const hasEntry = dateSet.has(day);
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={formatJournalDate(day)}
                onPress={() => {
                  haptic.tap();
                  setSelectedDate(day);
                }}
                style={({ pressed }) => [
                  styles.day,
                  isSelected && styles.daySelected,
                  pressed && { opacity: 0.7 },
                ]}>
                <Text style={[styles.dayName, isSelected && styles.dayTextSelected]}>{weekdayShort(day)}</Text>
                <Text style={[styles.dayNumber, isSelected && styles.dayTextSelected]}>{dayNumber(day)}</Text>
                <View
                  style={[
                    styles.dot,
                    hasEntry && { backgroundColor: isSelected ? '#FFFFFF' : colors.accent },
                  ]}
                />
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : (
          <>
            <Card style={styles.dayCard}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Zápis dne"
                onPress={() => openEditor(selectedDate)}
                pressedScale={0.985}
                style={styles.dayCardPressable}>
                <View style={styles.dayCardHead}>
                  <View style={ui.flex}>
                    <Text style={ui.title}>{formatJournalDate(selectedDate)}</Text>
                    <Caption>{selectedDate === today ? 'Dnes' : 'Zápis dne'}</Caption>
                  </View>
                  {streak > 0 ? (
                    <Pill
                      label={`${streak} ${streak === 1 ? 'den' : streak < 5 ? 'dny' : 'dní'} v řadě`}
                      color={palette.orange}
                    />
                  ) : null}
                </View>
                {selected ? <Text style={styles.entryText}>{selected.summary}</Text> : null}
              </PressableScale>
              {selected ? null : (
                <View style={styles.emptyDay}>
                  <Caption>
                    {selectedDate === today
                      ? 'Dnes ještě nic. Napiš pár vět, jaký ten den byl.'
                      : 'Pro tenhle den není žádný zápis.'}
                  </Caption>
                  <PrimaryButton title="Zapsat den" onPress={() => openEditor(selectedDate)} />
                </View>
              )}
            </Card>

            {entries.length > 0 ? (
              <>
                <SectionHeader title="Zápisy" />
                <Card clip>
                  {entries.map((entry, index) => (
                    <Row
                      key={entry.id}
                      last={index === entries.length - 1}
                      onPress={() => openEditor(entry.entry_date)}
                      accessibilityLabel={formatJournalDate(entry.entry_date)}>
                      <View style={ui.flex}>
                        <Text style={ui.title}>{formatJournalDate(entry.entry_date)}</Text>
                        <Text style={styles.preview} numberOfLines={2}>
                          {entry.summary}
                        </Text>
                      </View>
                      <SymbolIcon name="chevronRight" color={colors.tertiary} size={13} />
                    </Row>
                  ))}
                </Card>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 32,
  },
  pressed: {
    opacity: 0.4,
  },
  stripScroll: {
    marginHorizontal: -16,
    flexGrow: 0,
  },
  strip: {
    paddingHorizontal: 16,
    gap: 8,
  },
  day: {
    width: 52,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
  daySelected: {
    backgroundColor: colors.accent,
  },
  dayName: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  dayNumber: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  dayCard: {
    padding: 18,
    gap: 14,
  },
  dayCardPressable: {
    gap: 14,
  },
  dayCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entryText: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 24,
  },
  emptyDay: {
    gap: 14,
  },
  preview: {
    color: colors.secondary,
    fontSize: 15,
    lineHeight: 20,
    marginTop: 2,
  },
});
