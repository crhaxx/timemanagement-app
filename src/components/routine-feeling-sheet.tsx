import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Chip, PrimaryButton } from '@/components/ui';
import { colors } from '@/constants/colors';

export const ROUTINE_FEELINGS = ['Skvěle', 'Dobře', 'V pohodě', 'Těžce', 'Špatně'] as const;

/** Asks how the routine felt; the answer is stored on `routine_logs.note`. */
export function RoutineFeelingSheet({
  visible,
  routineTitle,
  onClose,
  onSave,
}: {
  visible: boolean;
  routineTitle: string;
  onClose: () => void;
  onSave: (note: string | null) => void;
}) {
  const [feeling, setFeeling] = useState<string | null>(null);
  const [detail, setDetail] = useState('');

  useEffect(() => {
    if (!visible) {
      setFeeling(null);
      setDetail('');
    }
  }, [visible]);

  function resolveNote() {
    const trimmed = detail.trim();
    if (trimmed && feeling) return `${feeling} — ${trimmed}`;
    if (trimmed) return trimmed;
    return feeling;
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {(dismiss) => (
        <View style={styles.body}>
          <Text style={styles.heading}>Jak ses cítil?</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            Po „{routineTitle}“
          </Text>

          <View style={styles.chips}>
            {ROUTINE_FEELINGS.map((option) => (
              <Chip
                key={option}
                label={option}
                color={colors.routine}
                selected={feeling === option}
                onPress={() => setFeeling((current) => (current === option ? null : option))}
              />
            ))}
          </View>

          <TextInput
            value={detail}
            onChangeText={setDetail}
            placeholder="Nebo to napiš vlastními slovy…"
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
          />

          <PrimaryButton
            title="Uložit"
            color={colors.routine}
            onPress={() => {
              const note = resolveNote();
              dismiss(() => onSave(note));
            }}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => dismiss(() => onSave(null))}
            style={styles.skip}>
            <Text style={styles.skipText}>Přeskočit</Text>
          </Pressable>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 16,
  },
  heading: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.secondary,
    fontSize: 15,
    marginTop: -8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  input: {
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  skip: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    color: colors.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
