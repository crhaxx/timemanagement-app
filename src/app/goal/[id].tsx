import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  Caption,
  Card,
  ChoiceGroup,
  ErrorBanner,
  Pill,
  PrimaryButton,
  ProgressBar,
  Row,
  SheetHeader,
  TextButton,
  ui,
} from '@/components/ui';
import { colors, palette } from '@/constants/colors';
import { GOAL_STATUS_LABELS, goalStatusLabel, numericValue } from '@/constants/labels';
import { confirmDestructive } from '@/lib/actions';
import { GOAL_COLUMNS, goalProgress } from '@/lib/data';
import { addMonths, formatDeadline, formatDeadlineLabel, localDateISO, parseLocalDate } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { Goal, GoalStatus } from '@/types/database';

type ParentOption = { id: string; title: string; status: GoalStatus };

export default function GoalDetailSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');
  const [deadline, setDeadline] = useState('');
  const [parentId, setParentId] = useState('');
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [hasSubgoals, setHasSubgoals] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(supabase !== null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  function fill(loaded: Goal) {
    setTitle(loaded.title);
    setDescription(loaded.description ?? '');
    setCurrentValue(loaded.current_value ?? '');
    setTargetValue(loaded.target_value ?? '');
    setUnit(loaded.unit ?? '');
    setDeadline(loaded.deadline?.slice(0, 10) ?? '');
    setParentId(loaded.parent_id ?? '');
  }

  useEffect(() => {
    if (!supabase || !id) return;
    let cancelled = false;
    void Promise.all([
      supabase.from('goals').select(GOAL_COLUMNS).eq('id', id).maybeSingle(),
      supabase.from('goals').select('id, parent_id, title, status').neq('id', id).order('created_at', { ascending: true }),
    ]).then(([goalResult, othersResult]) => {
      if (cancelled) return;
      const queryError = goalResult.error ?? othersResult.error;
      if (queryError) {
        setError(queryError.message);
      } else if (!goalResult.data) {
        setError('Cíl už neexistuje.');
      } else {
        const loaded = goalResult.data;
        const others = othersResult.data ?? [];
        setGoal(loaded);
        fill(loaded);
        setEditing(false);
        setHasSubgoals(others.some((other) => other.parent_id === loaded.id));
        setParents(
          others.flatMap((other) => {
            const isRoot = other.parent_id === null && other.status === 'active';
            const isCurrentParent = other.id === loaded.parent_id;
            if (!isRoot && !isCurrentParent) return [];
            return [{ id: other.id, title: other.title, status: other.status }];
          }),
        );
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const dirty = goal
    ? title !== goal.title ||
      description !== (goal.description ?? '') ||
      currentValue !== (goal.current_value ?? '') ||
      targetValue !== (goal.target_value ?? '') ||
      unit !== (goal.unit ?? '') ||
      deadline !== (goal.deadline?.slice(0, 10) ?? '') ||
      parentId !== (goal.parent_id ?? '')
    : false;

  function openAndroidPicker() {
    DateTimePickerAndroid.open({
      value: parseLocalDate(deadline || localDateISO()),
      mode: 'date',
      onChange: (_event, date) => {
        if (date) setDeadline(localDateISO(date));
      },
    });
  }

  function cancelEdit() {
    if (goal) fill(goal);
    setEditing(false);
    setError(null);
  }

  async function saveEdits() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Pojmenuj cíl.');
      return;
    }
    if (!supabase || !goal) return;
    setSaving(true);
    setError(null);
    const next: Goal = {
      ...goal,
      title: trimmed,
      description: description.trim() || null,
      current_value: currentValue.trim() || null,
      target_value: targetValue.trim() || null,
      unit: unit.trim() || null,
      deadline: deadline || null,
      parent_id: hasSubgoals ? goal.parent_id : parentId || null,
      updated_at: new Date().toISOString(),
    };
    const { error: updateError } = await supabase
      .from('goals')
      .update({
        title: next.title,
        description: next.description,
        current_value: next.current_value,
        target_value: next.target_value,
        unit: next.unit,
        deadline: next.deadline,
        parent_id: next.parent_id,
        updated_at: next.updated_at,
      })
      .eq('id', goal.id);
    setSaving(false);
    if (updateError) {
      haptic.error();
      setError(updateError.message);
      return;
    }
    haptic.success();
    setGoal(next);
    fill(next);
    setEditing(false);
  }

  async function changeStatus(status: GoalStatus) {
    if (!supabase || !goal) return;
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from('goals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', goal.id);
    setSaving(false);
    if (updateError) {
      haptic.error();
      setError(updateError.message);
      return;
    }
    haptic.success();
    router.back();
  }

  function confirmDelete() {
    if (!goal) return;
    confirmDestructive(
      'Smazat cíl',
      `Opravdu smazat „${goal.title}“? Smažou se i podcíle. Úkoly zůstanou, jen se od cíle odpojí.`,
      'Smazat',
      () => {
        void (async () => {
          if (!supabase) return;
          const { error: deleteError } = await supabase.from('goals').delete().eq('id', goal.id);
          if (deleteError) {
            setError(deleteError.message);
            return;
          }
          haptic.warning();
          router.back();
        })();
      },
    );
  }

  const shown: Goal | null = goal
    ? editing
      ? {
          ...goal,
          current_value: currentValue.trim() || null,
          target_value: targetValue.trim() || null,
          unit: unit.trim() || null,
        }
      : goal
    : null;
  const progress = shown ? goalProgress(shown) : null;
  const statusLabel = shown ? goalStatusLabel(shown.current_value, shown.target_value, shown.unit) : null;

  return (
    <View style={ui.screen}>
      <SheetHeader
        title={editing ? 'Upravit cíl' : 'Cíl'}
        cancelLabel={editing ? 'Zrušit' : 'Zavřít'}
        saveLabel="Uložit"
        onCancel={editing ? cancelEdit : () => router.back()}
        onSave={editing ? () => void saveEdits() : undefined}
        canSave={dirty && title.trim().length > 0}
        saving={saving}
      />
      <ScrollView
        contentContainerStyle={ui.sheetContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets>
        {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} /> : null}
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        {goal && !editing ? (
          <>
            <View style={styles.heading}>
              <Text style={styles.title}>{goal.title}</Text>
              <View style={styles.pills}>
                <Pill
                  label={GOAL_STATUS_LABELS[goal.status]}
                  color={goal.status === 'done' ? palette.green : goal.status === 'dropped' ? palette.gray : colors.goal}
                />
                {goal.deadline ? <Pill label={formatDeadlineLabel(goal.deadline)} color={palette.orange} /> : null}
              </View>
              {goal.description ? <Caption>{goal.description}</Caption> : null}
            </View>

            {progress !== null || statusLabel ? (
              <Card style={styles.progressCard}>
                {progress !== null ? (
                  <>
                    <Text style={styles.percent}>{Math.round(progress * 100)} %</Text>
                    <ProgressBar value={progress} color={colors.goal} height={10} />
                  </>
                ) : null}
                {statusLabel ? <Caption>{statusLabel}</Caption> : null}
              </Card>
            ) : null}

            <View style={styles.actions}>
              <View style={styles.editButton}>
                <TextButton title="Upravit" onPress={() => setEditing(true)} />
              </View>
              {goal.status === 'active' ? (
                <>
                  <PrimaryButton
                    title="Označit jako splněný"
                    color={colors.success}
                    onPress={() => void changeStatus('done')}
                    disabled={saving}
                  />
                  <View style={styles.actionRow}>
                    <TextButton title="Zrušit cíl" color={palette.orange} onPress={() => void changeStatus('dropped')} />
                    <TextButton title="Smazat" color={colors.danger} onPress={confirmDelete} />
                  </View>
                </>
              ) : (
                <>
                  <PrimaryButton title="Obnovit cíl" onPress={() => void changeStatus('active')} disabled={saving} />
                  <View style={styles.actionRow}>
                    <TextButton title="Smazat" color={colors.danger} onPress={confirmDelete} />
                  </View>
                </>
              )}
            </View>
          </>
        ) : null}

        {goal && editing ? (
          <>
            {progress !== null || statusLabel ? (
              <Card style={styles.progressCard}>
                {progress !== null ? (
                  <>
                    <Text style={styles.percent}>{Math.round(progress * 100)} %</Text>
                    <ProgressBar value={progress} color={colors.goal} height={10} />
                  </>
                ) : null}
                {statusLabel ? <Caption>{statusLabel}</Caption> : null}
              </Card>
            ) : null}

            <Card clip>
              <View style={styles.editHeading}>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Kam to má směřovat?"
                  placeholderTextColor={colors.muted}
                  style={[ui.input, styles.editTitle]}
                />
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Proč tohle chci"
                  placeholderTextColor={colors.muted}
                  style={[ui.input, styles.description]}
                  multiline
                />
              </View>
            </Card>

            <View style={{ gap: 8 }}>
              <Card clip>
                <FieldRow label="Teď" value={currentValue} onChange={setCurrentValue} placeholder="0 nebo začátečník" />
                <FieldRow label="Cíl" value={targetValue} onChange={setTargetValue} placeholder="100 000 nebo expert" />
                <FieldRow label="Jednotka" value={unit} onChange={setUnit} placeholder="Kč, kg, modulů" last />
              </Card>
              <Caption style={{ paddingHorizontal: 4 }}>
                {numericValue(currentValue) !== null && numericValue(targetValue) !== null
                  ? 'Obě hodnoty jsou čísla, takže uvidíš progress v procentech.'
                  : 'Čísla dají progress v procentech. Text zůstane tak, jak ho napíšeš.'}
              </Caption>
            </View>

            <Card clip>
              <Row last>
                <Text style={ui.fieldLabel}>Termín</Text>
                <View style={styles.deadline}>
                  {deadline ? (
                    <>
                      {Platform.OS === 'ios' ? (
                        <DateTimePicker
                          value={parseLocalDate(deadline)}
                          mode="date"
                          display="compact"
                          locale="cs-CZ"
                          onChange={(_event, date) => {
                            if (date) setDeadline(localDateISO(date));
                          }}
                        />
                      ) : (
                        <TextButton title={formatDeadline(deadline)} onPress={openAndroidPicker} />
                      )}
                      <TextButton title="Odebrat" color={colors.danger} onPress={() => setDeadline('')} />
                    </>
                  ) : (
                    <TextButton title="Nastavit" onPress={() => setDeadline(addMonths(localDateISO(), 3))} />
                  )}
                </View>
              </Row>
            </Card>

            {!hasSubgoals && parents.length > 0 ? (
              <ChoiceGroup
                label="Podcíl pro"
                value={parentId}
                options={[
                  { value: '', label: 'Nic (hlavní cíl)' },
                  ...parents.map((parent) => ({
                    value: parent.id,
                    label: parent.status === 'active' ? parent.title : `${parent.title} (archiv)`,
                    color: colors.goal,
                  })),
                ]}
                onChange={setParentId}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function FieldRow({
  label,
  value,
  onChange,
  placeholder,
  last,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  last?: boolean;
}) {
  return (
    <Row last={last}>
      <Text style={ui.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[ui.input, { flex: 1, textAlign: 'right' }]}
      />
    </Row>
  );
}

const styles = StyleSheet.create({
  heading: {
    gap: 10,
    paddingHorizontal: 4,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  editHeading: {
    padding: 16,
    gap: 12,
  },
  editTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  description: {
    minHeight: 56,
    textAlignVertical: 'top',
    color: colors.secondary,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  progressCard: {
    padding: 20,
    gap: 12,
  },
  percent: {
    color: colors.goal,
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  deadline: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
  },
  actions: {
    gap: 16,
  },
  editButton: {
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
  },
});
