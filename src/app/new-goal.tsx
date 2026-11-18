import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, Text, TextInput, View } from 'react-native';

import {
  Caption,
  Card,
  ChoiceGroup,
  ErrorBanner,
  Row,
  SheetHeader,
  TextButton,
  ui,
} from '@/components/ui';
import { colors } from '@/constants/colors';
import { numericValue } from '@/constants/labels';
import { GOAL_COLUMNS } from '@/lib/data';
import { addMonths, formatDeadline, localDateISO, parseLocalDate } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { Goal } from '@/types/database';

export default function NewGoalSheet() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');
  const [deadline, setDeadline] = useState('');
  const [parentId, setParentId] = useState('');
  const [parents, setParents] = useState<Goal[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    void supabase
      .from('goals')
      .select(GOAL_COLUMNS)
      .eq('status', 'active')
      .is('parent_id', null)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setParents(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function openAndroidPicker() {
    DateTimePickerAndroid.open({
      value: parseLocalDate(deadline || localDateISO()),
      mode: 'date',
      onChange: (_event, date) => {
        if (date) setDeadline(localDateISO(date));
      },
    });
  }

  async function save() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Pojmenuj cíl.');
      return;
    }
    if (!supabase) {
      setError(supabaseConfigError);
      return;
    }

    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('goals').insert({
      title: trimmed,
      description: description.trim() || null,
      parent_id: parentId || null,
      current_value: currentValue.trim() || null,
      target_value: targetValue.trim() || null,
      unit: unit.trim() || null,
      deadline: deadline || null,
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
        title="Nový cíl"
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
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets>
        <Card clip>
          <View style={{ padding: 16, gap: 12 }}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Kam to má směřovat?"
              placeholderTextColor={colors.muted}
              style={[ui.input, { fontSize: 20, fontWeight: '600' }]}
              autoFocus
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Proč tohle chci"
              placeholderTextColor={colors.muted}
              style={[ui.input, { minHeight: 56, textAlignVertical: 'top', color: colors.secondary }]}
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
              : 'Čísla dají progress v procentech. Text zůstane tak, jak ho napíšeš, třeba „začátečník“ → „expert“.'}
          </Caption>
        </View>

        <Card clip>
          <Row last>
            <Text style={ui.fieldLabel}>Termín</Text>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
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

        {parents.length > 0 ? (
          <ChoiceGroup
            label="Podcíl pro"
            value={parentId}
            options={[
              { value: '', label: 'Nic (hlavní cíl)' },
              ...parents.map((goal) => ({ value: goal.id, label: goal.title, color: colors.goal })),
            ]}
            onChange={setParentId}
          />
        ) : null}

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
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
