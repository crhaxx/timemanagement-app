import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { SymbolIcon } from '@/components/symbol-icon';
import { Caption, Card, Chip, Eyebrow, PressableScale, ROUNDED } from '@/components/ui';
import { colors, onInk } from '@/constants/colors';
import { formatMinutes, ROUTINE_FREQUENCY_LABELS, WEEKDAY_LABELS } from '@/constants/labels';
import { formatPreferredTime, routineScheduleLabel } from '@/lib/data';
import { isoWeekday, localDateISO, parseLocalDate } from '@/lib/dates';
import { useFocusAreas } from '@/lib/focus-areas';
import { haptic } from '@/lib/haptics';
import {
  ROUTINE_FREQUENCIES,
  type Goal,
  type Routine,
  type RoutineFrequency,
} from '@/types/database';

const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
const WORKDAYS = [1, 2, 3, 4, 5];
const MONTH_DAYS = Array.from({ length: 31 }, (_, index) => index + 1);
const DURATION_PRESETS = [5, 10, 15, 20, 30, 45, 60, 90];
const MAX_DURATION = 600;
const DEFAULT_TIME = '08:00';

/** Everything the form edits, as the user sees it rather than as it is stored. */
export type RoutineDraft = {
  title: string;
  notes: string;
  skipRule: string;
  frequency: RoutineFrequency;
  /** ISO weekdays, 1 = Monday. Kept in step with `frequency` for daily and workdays. */
  daysOfWeek: number[];
  /** Day of the month for monthly routines. */
  monthDay: number | null;
  duration: number | null;
  /** `HH:MM`, or empty for no particular time. */
  preferredTime: string;
  focusAreaId: string;
  goalId: string;
};

export function newRoutineDraft(): RoutineDraft {
  return {
    title: '',
    notes: '',
    skipRule: '',
    frequency: 'daily',
    daysOfWeek: ALL_WEEKDAYS,
    monthDay: null,
    duration: 20,
    preferredTime: '',
    focusAreaId: '',
    goalId: '',
  };
}

export function routineToDraft(routine: Routine): RoutineDraft {
  const days = routine.days_of_week ?? [];
  const monthly = routine.frequency === 'monthly';
  return {
    title: routine.title,
    notes: routine.notes ?? '',
    skipRule: routine.skip_rule ?? '',
    frequency: routine.frequency,
    daysOfWeek:
      routine.frequency === 'weekdays'
        ? WORKDAYS
        : routine.frequency === 'daily' || monthly || days.length === 0
          ? ALL_WEEKDAYS
          : [...days].sort((a, b) => a - b),
    monthDay: monthly ? (days[0] ?? null) : null,
    duration: routine.duration_minutes,
    preferredTime: formatPreferredTime(routine.preferred_time) ?? '',
    focusAreaId: routine.focus_area_id ?? '',
    goalId: routine.goal_id ?? '',
  };
}

function storedDays(draft: RoutineDraft) {
  if (draft.frequency === 'monthly') return draft.monthDay ? [draft.monthDay] : null;
  if (draft.frequency === 'daily') return ALL_WEEKDAYS;
  if (draft.frequency === 'weekdays') return WORKDAYS;
  return draft.daysOfWeek;
}

function storedTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return undefined;
  return `${match[1].padStart(2, '0')}:${match[2]}:00`;
}

/** Checks the draft and turns it into the columns to write, or says what is missing. */
export function routineDraftValues(draft: RoutineDraft) {
  const title = draft.title.trim();
  if (!title) return { values: null, error: 'Pojmenuj rutinu.' };
  if ((draft.frequency === 'weekly' || draft.frequency === 'custom') && draft.daysOfWeek.length === 0) {
    return { values: null, error: 'Vyber aspoň jeden den.' };
  }
  if (draft.frequency === 'monthly' && !draft.monthDay) {
    return { values: null, error: 'Vyber den v měsíci.' };
  }
  const time = storedTime(draft.preferredTime);
  if (time === undefined) return { values: null, error: 'Čas zadej jako HH:MM, třeba 21:20.' };

  return {
    values: {
      title,
      notes: draft.notes.trim() || null,
      skip_rule: draft.skipRule.trim() || null,
      frequency: draft.frequency,
      days_of_week: storedDays(draft),
      duration_minutes: draft.duration,
      preferred_time: time,
      focus_area_id: draft.focusAreaId || null,
      goal_id: draft.goalId || null,
    },
    error: null,
  };
}

/** The editable body shared by the new-routine sheet and a routine's edit mode. */
export function RoutineForm({
  draft,
  onChange,
  goals,
  autoFocus,
}: {
  draft: RoutineDraft;
  onChange: (patch: Partial<RoutineDraft>) => void;
  goals: Goal[];
  autoFocus?: boolean;
}) {
  const { areas } = useFocusAreas();
  const monthly = draft.frequency === 'monthly';

  const summary = [
    routineScheduleLabel({
      frequency: draft.frequency,
      days_of_week: storedDays(draft),
      preferred_time: storedTime(draft.preferredTime) ?? null,
    }),
    draft.duration ? formatMinutes(draft.duration) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  function selectFrequency(frequency: RoutineFrequency) {
    const patch: Partial<RoutineDraft> = { frequency };
    if (frequency === 'daily') patch.daysOfWeek = ALL_WEEKDAYS;
    if (frequency === 'weekdays') patch.daysOfWeek = WORKDAYS;
    // "Weekly" starting from every day would be daily again; begin with today instead.
    if (frequency === 'weekly' && draft.daysOfWeek.length === 7) {
      patch.daysOfWeek = [isoWeekday(localDateISO())];
    }
    if (frequency === 'monthly' && !draft.monthDay) {
      patch.monthDay = parseLocalDate(localDateISO()).getDate();
    }
    onChange(patch);
  }

  function toggleDay(day: number) {
    const days = draft.daysOfWeek.includes(day)
      ? draft.daysOfWeek.filter((value) => value !== day)
      : [...draft.daysOfWeek, day].sort((a, b) => a - b);
    // Editing the days of a fixed schedule makes it a custom one.
    const fixed = draft.frequency === 'daily' || draft.frequency === 'weekdays';
    onChange({ daysOfWeek: days, frequency: fixed ? 'custom' : draft.frequency });
  }

  return (
    <>
      <View style={styles.hero}>
        <GrowingInput
          value={draft.title}
          onChangeText={(title) => onChange({ title })}
          placeholder="Co chceš opakovat?"
          placeholderTextColor={colors.inkSecondary}
          selectionColor={onInk.teal}
          keyboardAppearance="dark"
          style={styles.title}
          autoFocus={autoFocus}
          submitBehavior="blurAndSubmit"
          returnKeyType="done"
          accessibilityLabel="Název rutiny"
        />
        <GrowingInput
          value={draft.notes}
          onChangeText={(notes) => onChange({ notes })}
          placeholder="Proč to děláš? Poznámka pro tebe."
          placeholderTextColor="rgba(235, 235, 245, 0.36)"
          selectionColor={onInk.teal}
          keyboardAppearance="dark"
          style={styles.notes}
          accessibilityLabel="Poznámka"
        />
        <View style={styles.summary}>
          <SymbolIcon name="routine" color={onInk.teal} size={14} weight="semibold" />
          <Text style={styles.summaryText} numberOfLines={2}>
            {summary}
          </Text>
        </View>
      </View>

      <Card style={styles.section}>
        <Eyebrow>Jak často</Eyebrow>
        <View style={styles.chips}>
          {ROUTINE_FREQUENCIES.map((value) => (
            <FormChip
              key={value}
              label={ROUTINE_FREQUENCY_LABELS[value]}
              selected={draft.frequency === value}
              onPress={() => selectFrequency(value)}
            />
          ))}
        </View>

        {monthly ? (
          <View style={styles.month}>
            {Array.from({ length: Math.ceil(MONTH_DAYS.length / 7) }, (_, row) => (
              <View key={row} style={styles.monthRow}>
                {Array.from({ length: 7 }, (_, column) => {
                  const day = MONTH_DAYS[row * 7 + column];
                  if (!day) return <View key={column} style={styles.monthCell} />;
                  const selected = draft.monthDay === day;
                  return (
                    <Pressable
                      key={column}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${day}. den v měsíci`}
                      onPress={() => {
                        haptic.tap();
                        onChange({ monthDay: day });
                      }}
                      style={styles.monthCell}>
                      <View style={[styles.monthFace, selected && styles.daySelected]}>
                        <Text style={[styles.monthText, selected && styles.dayTextSelected]}>{day}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            {draft.monthDay && draft.monthDay > 28 ? (
              <Caption style={styles.hint}>V kratším měsíci tenhle den není, rutina se v něm neobjeví.</Caption>
            ) : null}
          </View>
        ) : (
          <View style={styles.days}>
            {ALL_WEEKDAYS.map((day) => {
              const selected = draft.daysOfWeek.includes(day);
              return (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={WEEKDAY_LABELS[day]}
                  hitSlop={4}
                  onPress={() => {
                    haptic.tap();
                    toggleDay(day);
                  }}
                  style={[styles.day, selected && styles.daySelected]}>
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]}>
                    {WEEKDAY_LABELS[day]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.separator} />

        <View style={styles.timeRow}>
          <SymbolIcon name="time" color={colors.routine} size={18} />
          <Text style={styles.rowLabel}>Čas</Text>
          <TimeField value={draft.preferredTime} onChange={(preferredTime) => onChange({ preferredTime })} />
        </View>
      </Card>

      <Card style={styles.section}>
        <Eyebrow>Jak dlouho</Eyebrow>
        <DurationField value={draft.duration} onChange={(duration) => onChange({ duration })} />
      </Card>

      <Card style={styles.section}>
        <Eyebrow>Kdy vynechat</Eyebrow>
        <GrowingInput
          value={draft.skipRule}
          onChangeText={(skipRule) => onChange({ skipRule })}
          placeholder="Třeba po posilovně nebo při nemoci"
          placeholderTextColor={colors.muted}
          style={styles.skipInput}
          accessibilityLabel="Kdy vynechat"
        />
        <Caption style={styles.hint}>
          Je to jen připomínka pro tebe. Přeskočení dne zapisuješ ručně a sérii nepřeruší.
        </Caption>
      </Card>

      {areas.length > 0 || goals.length > 0 ? (
        <Card style={styles.section}>
          {areas.length > 0 ? (
            <>
              <Eyebrow>Oblast</Eyebrow>
              <View style={styles.chips}>
                <FormChip
                  label="Bez oblasti"
                  selected={draft.focusAreaId === ''}
                  onPress={() => onChange({ focusAreaId: '' })}
                />
                {areas.map((area) => (
                  <FormChip
                    key={area.id}
                    label={area.name}
                    color={area.color?.startsWith('#') ? area.color : colors.routine}
                    selected={draft.focusAreaId === area.id}
                    onPress={() => onChange({ focusAreaId: area.id })}
                  />
                ))}
              </View>
            </>
          ) : null}
          {areas.length > 0 && goals.length > 0 ? <View style={styles.separator} /> : null}
          {goals.length > 0 ? (
            <>
              <Eyebrow>Vázané na cíl</Eyebrow>
              <View style={styles.chips}>
                <FormChip
                  label="Bez cíle"
                  selected={draft.goalId === ''}
                  onPress={() => onChange({ goalId: '' })}
                />
                {goals.map((goal) => (
                  <FormChip
                    key={goal.id}
                    label={goal.title}
                    color={colors.goal}
                    selected={draft.goalId === goal.id}
                    onPress={() => onChange({ goalId: goal.id })}
                  />
                ))}
              </View>
            </>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}

/**
 * A multiline field as tall as its text. Native does that on its own; on web a
 * textarea keeps a fixed number of rows, so its content height is applied by hand.
 */
function GrowingInput({ style, ...rest }: TextInputProps) {
  const [height, setHeight] = useState<number | null>(null);
  return (
    <TextInput
      {...rest}
      multiline
      scrollEnabled={false}
      rows={Platform.OS === 'web' ? 1 : undefined}
      onContentSizeChange={
        Platform.OS === 'web'
          ? (event) => setHeight(Math.ceil(event.nativeEvent.contentSize.height))
          : undefined
      }
      style={[style, height ? { height } : null]}
    />
  );
}

/** The form's cards are white, so its chips are the filled kind, in the routine color by default. */
function FormChip({
  label,
  selected,
  color = colors.routine,
  onPress,
}: {
  label: string;
  selected: boolean;
  color?: string;
  onPress: () => void;
}) {
  return <Chip flat label={label} selected={selected} color={color} onPress={onPress} />;
}

function timeAsDate(value: string) {
  const [hours, minutes] = (value || DEFAULT_TIME).split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

function dateAsTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function TimeField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  if (Platform.OS === 'web') {
    return (
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="21:20"
        placeholderTextColor={colors.muted}
        inputMode="numeric"
        style={styles.timeInput}
        accessibilityLabel="Čas"
      />
    );
  }

  function openAndroidPicker() {
    DateTimePickerAndroid.open({
      value: timeAsDate(value),
      mode: 'time',
      is24Hour: true,
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(dateAsTime(date));
      },
    });
  }

  if (!value) {
    return (
      <View style={styles.timeValue}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Přidat čas"
          onPress={() => {
            haptic.tap();
            if (Platform.OS === 'android') openAndroidPicker();
            else onChange(DEFAULT_TIME);
          }}
          style={styles.timePill}>
          <Text style={styles.timeAdd}>Přidat</Text>
        </PressableScale>
      </View>
    );
  }

  return (
    <View style={styles.timeValue}>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={timeAsDate(value)}
          mode="time"
          display="compact"
          locale="cs-CZ"
          accentColor={colors.routine}
          onChange={(_event, date) => {
            if (date) onChange(dateAsTime(date));
          }}
        />
      ) : (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Čas ${value}, změnit`}
          onPress={openAndroidPicker}
          style={styles.timePill}>
          <Text style={styles.timeText}>{value}</Text>
        </PressableScale>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Bez času"
        hitSlop={12}
        onPress={() => {
          haptic.tap();
          onChange('');
        }}
        style={({ pressed }) => [styles.timeClear, pressed && styles.pressed]}>
        <SymbolIcon name="close" color={colors.secondary} size={11} weight="bold" />
      </Pressable>
    </View>
  );
}

function DurationField({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const minutes = value ?? 0;

  function step(direction: 1 | -1) {
    // Land on the next multiple of five in that direction.
    const next = direction > 0 ? Math.floor(minutes / 5) * 5 + 5 : Math.ceil(minutes / 5) * 5 - 5;
    const clamped = Math.min(MAX_DURATION, Math.max(0, next));
    if (clamped === minutes) return;
    haptic.tap();
    onChange(clamped === 0 ? null : clamped);
  }

  return (
    <>
      <View style={styles.stepper}>
        <StepButton icon="minus" label="Ubrat pět minut" disabled={minutes === 0} onPress={() => step(-1)} />
        <Text
          style={[styles.duration, value === null && styles.durationNone]}
          accessibilityLiveRegion="polite">
          {value ? formatMinutes(value) : 'Bez odhadu'}
        </Text>
        <StepButton
          icon="add"
          label="Přidat pět minut"
          disabled={minutes >= MAX_DURATION}
          onPress={() => step(1)}
        />
      </View>
      <View style={styles.chips}>
        {DURATION_PRESETS.map((preset) => (
          <FormChip
            key={preset}
            label={formatMinutes(preset)}
            selected={value === preset}
            onPress={() => onChange(preset)}
          />
        ))}
      </View>
    </>
  );
}

function StepButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'add' | 'minus';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      pressedScale={0.92}
      style={[styles.stepButton, disabled && styles.stepButtonDisabled]}>
      <SymbolIcon name={icon} color={colors.text} size={18} weight="semibold" />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.ink,
    borderRadius: 26,
    borderCurve: 'continuous',
    padding: 20,
    gap: 10,
  },
  title: {
    color: colors.inkText,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    paddingVertical: 0,
    outlineWidth: 0,
  },
  notes: {
    color: colors.inkSecondary,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 0,
    outlineWidth: 0,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: onInk.separator,
  },
  summaryText: {
    flex: 1,
    color: colors.inkText,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  section: {
    padding: 16,
    gap: 14,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pressed: {
    opacity: 0.6,
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  day: {
    flex: 1,
    maxWidth: 46,
    aspectRatio: 1,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
  },
  daySelected: {
    backgroundColor: colors.routine,
  },
  dayText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  month: {
    gap: 4,
  },
  monthRow: {
    flexDirection: 'row',
  },
  monthCell: {
    flex: 1,
    alignItems: 'center',
  },
  monthFace: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    color: colors.text,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 36,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 17,
  },
  timeValue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  timePill: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderCurve: 'continuous',
    justifyContent: 'center',
    backgroundColor: colors.fill,
  },
  timeAdd: {
    color: colors.routine,
    fontSize: 16,
    fontWeight: '600',
  },
  timeText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  timeClear: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
  },
  timeInput: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    textAlign: 'right',
    paddingVertical: 0,
    outlineWidth: 0,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
  },
  stepButtonDisabled: {
    opacity: 0.35,
  },
  duration: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontFamily: ROUNDED,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  durationNone: {
    color: colors.secondary,
    fontSize: 20,
    fontWeight: '600',
  },
  skipInput: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
    paddingVertical: 0,
    outlineWidth: 0,
  },
});
