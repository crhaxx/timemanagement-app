import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';

import { BottomSheet } from '@/components/bottom-sheet';
import { QuoteBlock } from '@/components/routines/quote-block';
import { SymbolIcon } from '@/components/symbol-icon';
import { Chip, Eyebrow, PrimaryButton } from '@/components/ui';
import { colors, palette } from '@/constants/colors';
import { czechDays, localDateISO } from '@/lib/dates';

export const ROUTINE_FEELINGS = ['Skvěle', 'Dobře', 'V pohodě', 'Těžce', 'Špatně'] as const;

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

/**
 * Marks the win and asks how the routine felt; the answer is stored on
 * `routine_logs.note`. `streak` is the run this completion brings the routine to.
 */
export function RoutineFeelingSheet({
  visible,
  routineTitle,
  streak,
  onClose,
  onSave,
}: {
  visible: boolean;
  routineTitle: string;
  streak?: number;
  onClose: () => void;
  onSave: (note: string | null) => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {(dismiss) => (
        <FeelingBody
          routineTitle={routineTitle}
          streak={streak}
          onSave={(note) => dismiss(() => onSave(note))}
        />
      )}
    </BottomSheet>
  );
}

/** Mounted only while the sheet is open, so every opening starts with a clean answer. */
function FeelingBody({
  routineTitle,
  streak,
  onSave,
}: {
  routineTitle: string;
  streak?: number;
  onSave: (note: string | null) => void;
}) {
  const [feeling, setFeeling] = useState<string | null>(null);
  const [detail, setDetail] = useState('');

  function resolveNote() {
    const trimmed = detail.trim();
    if (trimmed && feeling) return `${feeling} — ${trimmed}`;
    if (trimmed) return trimmed;
    return feeling;
  }

  return (
    <View style={styles.body}>
      <View style={styles.head}>
        {/* The one moment in the flow that earns a flourish: the badge settles in as the sheet lands. */}
        <Animated.View
          style={[
            styles.badge,
            {
              animationName: {
                from: { opacity: 0, transform: [{ scale: 0.8 }] },
                to: { opacity: 1, transform: [{ scale: 1 }] },
              },
              animationDuration: '320ms',
              animationDelay: '120ms',
              animationTimingFunction: EASE_OUT,
              animationFillMode: 'backwards',
            },
          ]}>
          <SymbolIcon name="checkmark" color="#FFFFFF" size={22} weight="bold" />
        </Animated.View>
        <View style={styles.headText}>
          <Text style={styles.heading}>Dobrá práce.</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {routineTitle}
          </Text>
        </View>
        {streak !== undefined && streak > 0 ? (
          <View style={styles.streak} accessible accessibilityLabel={`${czechDays(streak)} v řadě`}>
            <SymbolIcon name="flame" color={palette.orange} size={15} />
            <Text style={styles.streakText}>{czechDays(streak)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.quote}>
        <QuoteBlock mood="done" seed={`${localDateISO()}:${routineTitle}`} size="small" />
      </View>

      <Eyebrow style={styles.question}>Jak ses cítil?</Eyebrow>
      <View style={styles.chips}>
        {ROUTINE_FEELINGS.map((option) => (
          <Chip
            key={option}
            label={option}
            color={colors.routine}
            flat
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

      <PrimaryButton title="Uložit" color={colors.routine} onPress={() => onSave(resolveNote())} />

      <Pressable
        accessibilityRole="button"
        onPress={() => onSave(null)}
        style={({ pressed }) => [styles.skip, pressed && styles.pressed]}>
        <Text style={styles.skipText}>Uložit bez poznámky</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 16,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.routine,
  },
  headText: {
    flex: 1,
    gap: 2,
  },
  heading: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.secondary,
    fontSize: 15,
    lineHeight: 20,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    paddingHorizontal: 11,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 149, 0, 0.13)',
  },
  streakText: {
    color: palette.orange,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  quote: {
    padding: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: colors.background,
  },
  question: {
    marginTop: 2,
    marginBottom: -6,
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
  pressed: {
    opacity: 0.5,
  },
  skipText: {
    color: colors.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
