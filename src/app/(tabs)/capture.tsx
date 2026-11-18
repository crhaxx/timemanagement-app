import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import {
  EFFORT_MINUTES,
  TASK_CONTEXTS,
  TASK_PRIORITIES,
  type EffortMinutes,
  type Task,
  type TaskContext,
  type TaskPriority,
} from '@/types/database';

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

function formatEffort(minutes: number) {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? '1 h' : `${hours} h`;
  }
  return `${minutes} min`;
}

export default function HomeScreen() {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [context, setContext] = useState<TaskContext>('osobni');
  const [effort, setEffort] = useState<EffortMinutes>(15);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(supabase !== null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  const fetchTasks = useCallback(async () => {
    if (!supabase) {
      return { tasks: [] as Task[], error: supabaseConfigError };
    }

    const { data, error: queryError } = await supabase
      .from('tasks')
      .select('id, title, notes, context, effort_minutes, priority, status, deadline, created_at')
      .eq('status', 'backlog')
      .order('created_at', { ascending: false });

    if (queryError) {
      return { tasks: [] as Task[], error: queryError.message };
    }

    return { tasks: data ?? [], error: null };
  }, []);

  const applyResult = useCallback((result: { tasks: Task[]; error: string | null }) => {
    if (result.error) {
      setError(result.error);
    } else {
      setTasks(result.tasks);
      setError(null);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    void fetchTasks().then((result) => {
      if (!cancelled) applyResult(result);
    });

    return () => {
      cancelled = true;
    };
  }, [applyResult, fetchTasks]);

  async function saveTask() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Název úkolu nesmí být prázdný.');
      return;
    }
    if (!supabase) {
      setError(supabaseConfigError);
      return;
    }

    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('tasks').insert({
      title: trimmedTitle,
      notes: notes.trim() || null,
      context,
      effort_minutes: effort,
      priority,
      status: 'backlog',
    });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setTitle('');
    setNotes('');
    setRefreshing(true);
    applyResult(await fetchTasks());
  }

  async function markDone(task: Task) {
    if (!supabase) return;
    setActingId(task.id);
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: 'done' })
      .eq('id', task.id);
    setActingId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTasks((current) => current.filter((item) => item.id !== task.id));
  }

  function confirmDelete(task: Task) {
    Alert.alert('Smazat úkol', `Opravdu smazat „${task.title}“?`, [
      { text: 'Nechat', style: 'cancel' },
      {
        text: 'Smazat',
        style: 'destructive',
        onPress: () => {
          void deleteTask(task);
        },
      },
    ]);
  }

  async function deleteTask(task: Task) {
    if (!supabase) return;
    setActingId(task.id);
    const { error: deleteError } = await supabase.from('tasks').delete().eq('id', task.id);
    setActingId(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setTasks((current) => current.filter((item) => item.id !== task.id));
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void fetchTasks().then(applyResult);
          }}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <Text style={styles.lead}>Hoď sem úkol nebo nápad, ať nezůstane v hlavě.</Text>

              <View style={styles.card}>
                <Text style={styles.label}>Název</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Co je potřeba udělat?"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  returnKeyType="next"
                />

                <Text style={styles.label}>Poznámka</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Volitelné"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, styles.notesInput]}
                  multiline
                />

                <ChoiceRow
                  label="Kontext"
                  value={context}
                  options={TASK_CONTEXTS.map((value) => ({
                    value,
                    label: CONTEXT_LABELS[value],
                  }))}
                  onChange={setContext}
                />
                <ChoiceRow
                  label="Čas"
                  value={effort}
                  options={EFFORT_MINUTES.map((value) => ({
                    value,
                    label: formatEffort(value),
                  }))}
                  onChange={setEffort}
                />
                <ChoiceRow
                  label="Priorita"
                  value={priority}
                  options={TASK_PRIORITIES.map((value) => ({
                    value,
                    label: PRIORITY_LABELS[value],
                  }))}
                  onChange={setPriority}
                />

                <Pressable
                  accessibilityRole="button"
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={() => {
                    void saveTask();
                  }}
                  disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color={colors.accentText} />
                  ) : (
                    <Text style={styles.saveButtonText}>Uložit do Backlogu</Text>
                  )}
                </Pressable>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Backlog</Text>
                <Text style={styles.sectionCount}>{tasks.length}</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={colors.accent} style={styles.loader} />
            ) : (
              <Text style={styles.empty}>Backlog je prázdný. První věc sem hoď nahoře.</Text>
            )
          }
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              busy={actingId === item.id}
              onDone={() => {
                void markDone(item);
              }}
              onDelete={() => confirmDelete(item)}
            />
          )}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ChoiceRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceRow}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[styles.chip, selected && styles.chipSelected]}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TaskCard({
  task,
  busy,
  onDone,
  onDelete,
}: {
  task: Task;
  busy: boolean;
  onDone: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.taskCard}>
      <View style={styles.taskTitleRow}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[task.priority] }]} />
      </View>
      {task.notes ? <Text style={styles.taskNotes}>{task.notes}</Text> : null}
      <View style={styles.metaRow}>
        <Text style={styles.metaChip}>{CONTEXT_LABELS[task.context]}</Text>
        <Text style={styles.metaChip}>{formatEffort(task.effort_minutes)}</Text>
        <Text style={[styles.metaChip, { color: PRIORITY_COLORS[task.priority] }]}>
          {PRIORITY_LABELS[task.priority]}
        </Text>
      </View>
      <View style={styles.actionRow}>
        <Pressable accessibilityRole="button" style={styles.actionButton} onPress={onDone} disabled={busy}>
          <Text style={styles.doneText}>{busy ? 'Pracuji…' : 'Hotovo'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.actionButton} onPress={onDelete} disabled={busy}>
          <Text style={styles.deleteText}>Smazat</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 12,
  },
  headerBlock: {
    gap: 14,
    paddingTop: 8,
  },
  lead: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  field: {
    gap: 8,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  notesInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.accentText,
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: colors.accentText,
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  sectionCount: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  loader: {
    marginTop: 12,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  taskCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  taskTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  taskNotes: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    color: colors.success,
    fontWeight: '700',
  },
  deleteText: {
    color: colors.danger,
    fontWeight: '700',
  },
});
