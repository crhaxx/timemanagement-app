import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '@/constants/colors';
import { formatMinutes } from '@/constants/labels';
import { haptic } from '@/lib/haptics';
import { EFFORT_MINUTES } from '@/types/database';

const MAX_MINUTES = 99 * 60;

function digits(value: string) {
  return value.replace(/\D/g, '').slice(0, 3);
}

function totalMinutes(hours: string, minutes: string) {
  if (!hours && !minutes) return null;
  const total = (hours ? Number(hours) : 0) * 60 + (minutes ? Number(minutes) : 0);
  if (!Number.isInteger(total) || total < 1 || total > MAX_MINUTES) return null;
  return total;
}

export function EffortPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (minutes: number | null) => void;
}) {
  const [custom, setCustom] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const customTotal = totalMinutes(hours, minutes);

  function edit(nextHours: string, nextMinutes: string) {
    const cleanHours = digits(nextHours);
    const cleanMinutes = digits(nextMinutes);
    setHours(cleanHours);
    setMinutes(cleanMinutes);
    onChange(totalMinutes(cleanHours, cleanMinutes));
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.segmented}>
        {EFFORT_MINUTES.map((option) => {
          const selected = !custom && value === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                haptic.tap();
                setCustom(false);
                onChange(option);
              }}
              style={[styles.segment, selected && styles.segmentSelected]}>
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]} numberOfLines={1}>
                {formatMinutes(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: custom }}
        onPress={() => {
          haptic.tap();
          setCustom(true);
          onChange(customTotal);
        }}
        style={[styles.custom, custom && styles.customSelected]}>
        <Text style={[styles.customText, custom && styles.customTextSelected]}>
          {custom && customTotal ? `Vlastní · ${formatMinutes(customTotal)}` : 'Vlastní'}
        </Text>
      </Pressable>

      {custom ? (
        <View style={styles.inputs}>
          <TextInput
            value={hours}
            onChangeText={(text) => edit(text, minutes)}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.muted}
            maxLength={2}
            style={styles.input}
            accessibilityLabel="Hodiny"
          />
          <Text style={styles.unit}>h</Text>
          <TextInput
            value={minutes}
            onChangeText={(text) => edit(hours, text)}
            keyboardType="number-pad"
            placeholder="45"
            placeholderTextColor={colors.muted}
            maxLength={3}
            style={styles.input}
            accessibilityLabel="Minuty"
          />
          <Text style={styles.unit}>min</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.fill,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  segmentSelected: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  segmentTextSelected: {
    color: colors.text,
    fontWeight: '600',
  },
  custom: {
    alignItems: 'center',
    backgroundColor: colors.fill,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingVertical: 10,
  },
  customSelected: {
    backgroundColor: colors.accent,
  },
  customText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  customTextSelected: {
    color: colors.accentText,
  },
  inputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    width: 72,
    height: 48,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: colors.fill,
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  unit: {
    color: colors.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
