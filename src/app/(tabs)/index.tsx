import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import { type Task, type TaskContext, type TaskPriority } from '@/types/database';

const CONTEXT_LABELS: Record<TaskContext, string> = {
  osobni: 'Osobní',
  dibsido: 'Dibsido',
  weply: 'Weply',
  nccore: 'NCCore',
  skola: 'Škola',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Nízká',
  medium: 'Střední',
  high: 'Vysoká',
  urgent: 'Urgentní',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: colors.low,
  medium: colors.medium,
  high: colors.high,
  urgent: colors.urgent,
};

const PRIORITY_ORDER: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Dobrou noc';
  if (hour < 11) return 'Dobré ráno';
  if (hour < 18) return 'Dobré odpoledne';
  return 'Dobrý večer';
}

export default function OverviewScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [loading, setLoading] = useState(supabase !== null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  const load = useCallback(async () => {
    if (!supabase) return;
    const [backlog, done] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, notes, context, effort_minutes, priority, status, deadline, created_at')
        .eq('status', 'backlog'),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'done'),
    ]);
    const failure = backlog.error ?? done.error;
    if (failure) {
      setError(failure.message);
    } else {
      setTasks(backlog.data ?? []);
      setDoneCount(done.count ?? 0);
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

  const stats = useMemo(() => {
    const totalMinutes = tasks.reduce((sum, t) => sum + t.effort_minutes, 0);
    const urgent = tasks.filter((t) => t.priority === 'urgent' || t.priority === 'high').length;
    const byContext = (Object.keys(CONTEXT_LABELS) as TaskContext[])
      .map((ctx) => ({ ctx, count: tasks.filter((t) => t.context === ctx).length }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);
    const top = [...tasks]
      .sort(
        (a, b) =>
          PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
          a.effort_minutes - b.effort_minutes,
      )
      .slice(0, 5);
    return { totalMinutes, urgent, byContext, top };
  }, [tasks]);

  const maxContext = Math.max(1, ...stats.byContext.map((c) => c.count));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.accent}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }>
        <View style={styles.hero}>
          <Text style={styles.greeting}>{greeting()} 👋</Text>
          <Text style={styles.heroTitle}>
            {tasks.length === 0 && !loading
              ? 'Backlog je prázdný'
              : `Máš ${tasks.length} ${tasks.length === 1 ? 'otevřený úkol' : 'otevřených úkolů'}`}
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : (
          <>
            <View style={styles.statGrid}>
              <StatCard icon="list" label="V backlogu" value={String(tasks.length)} tint={colors.accent} />
              <StatCard icon="time-outline" label="Odhad času" value={formatDuration(stats.totalMinutes)} tint={colors.high} />
              <StatCard icon="flame-outline" label="Důležité" value={String(stats.urgent)} tint={colors.urgent} />
              <StatCard icon="checkmark-circle-outline" label="Hotovo" value={String(doneCount)} tint={colors.success} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Podle kontextu</Text>
              {stats.byContext.length === 0 ? (
                <Text style={styles.muted}>Zatím nic k zobrazení.</Text>
              ) : (
                stats.byContext.map(({ ctx, count }) => (
                  <View key={ctx} style={styles.barRow}>
                    <Text style={styles.barLabel}>{CONTEXT_LABELS[ctx]}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${(count / maxContext) * 100}%` }]} />
                    </View>
                    <Text style={styles.barCount}>{count}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Na řadě</Text>
              {stats.top.length === 0 ? (
                <Text style={styles.muted}>Nic nehoří. Přidej první úkol.</Text>
              ) : (
                stats.top.map((task) => (
                  <View key={task.id} style={styles.topRow}>
                    <View style={[styles.dot, { backgroundColor: PRIORITY_COLORS[task.priority] }]} />
                    <View style={styles.flex}>
                      <Text style={styles.topTitle} numberOfLines={1}>
                        {task.title}
                      </Text>
                      <Text style={styles.topMeta}>
                        {CONTEXT_LABELS[task.context]} · {formatDuration(task.effort_minutes)} ·{' '}
                        {PRIORITY_LABELS[task.priority]}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              style={styles.cta}
              onPress={() => router.navigate('/capture')}>
              <Ionicons name="add" size={22} color={colors.accentText} />
              <Text style={styles.ctaText}>Přidat úkol</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${tint}22` }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 14, paddingBottom: 28 },
  hero: { gap: 4, paddingTop: 8, paddingBottom: 4 },
  greeting: { color: colors.muted, fontSize: 15 },
  heroTitle: { color: colors.text, fontSize: 28, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  loader: { marginTop: 24 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: { color: colors.text, fontSize: 24, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  muted: { color: colors.muted, fontSize: 14 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { width: 70, color: colors.text, fontSize: 14, fontWeight: '600' },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: colors.accent },
  barCount: { width: 24, textAlign: 'right', color: colors.muted, fontSize: 14, fontWeight: '700' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  topTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  topMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: 14,
    minHeight: 50,
  },
  ctaText: { color: colors.accentText, fontSize: 16, fontWeight: '700' },
});
