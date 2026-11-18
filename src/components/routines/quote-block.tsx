import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { SymbolIcon } from '@/components/symbol-icon';
import { SERIF } from '@/components/ui';
import { colors } from '@/constants/colors';
import { pickQuote, type QuoteMood } from '@/constants/quotes';
import { haptic } from '@/lib/haptics';

/**
 * A quote that fits the moment. The seed pins it (one per day, per routine), and
 * a tap moves on to the next one. `tone` matches the surface it sits on.
 */
export function QuoteBlock({
  mood,
  seed,
  tone = 'light',
  accent = colors.routine,
  size = 'regular',
}: {
  mood: QuoteMood;
  seed: string;
  tone?: 'light' | 'ink';
  accent?: string;
  size?: 'regular' | 'small';
}) {
  // Stepping is tied to the pool it happened in, so a new mood or seed starts fresh.
  const pool = `${mood}:${seed}`;
  const [step, setStep] = useState({ pool, offset: 0 });
  const offset = step.pool === pool ? step.offset : 0;
  const quote = pickQuote(mood, seed, offset);
  const ink = tone === 'ink';
  const small = size === 'small';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${quote.text} ${quote.author}`}
      accessibilityHint="Další citát"
      onPress={() => {
        haptic.tap();
        setStep({ pool, offset: offset + 1 });
      }}
      style={({ pressed }) => pressed && styles.pressed}>
      {/* Remounted per quote; only a quote the user asked for fades in. */}
      <Animated.View
        key={quote.text}
        style={[
          styles.body,
          offset > 0 && {
            animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
            animationDuration: '220ms',
            animationTimingFunction: 'ease-out',
          },
        ]}>
        <View style={[styles.rule, { backgroundColor: accent }]} />
        <View style={styles.copy}>
          <Text
            style={[
              styles.text,
              small && styles.textSmall,
              { color: ink ? colors.inkText : colors.text },
            ]}>
            {quote.text}
          </Text>
          <View style={styles.footer}>
            <Text
              style={[styles.author, { color: ink ? colors.inkSecondary : colors.secondary }]}
              numberOfLines={1}>
              {quote.author}
            </Text>
            <SymbolIcon
              name="refresh"
              color={ink ? colors.inkSecondary : colors.tertiary}
              size={12}
              weight="semibold"
            />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.6,
  },
  body: {
    flexDirection: 'row',
    gap: 12,
  },
  rule: {
    width: 3,
    borderRadius: 1.5,
  },
  copy: {
    flex: 1,
    gap: 8,
  },
  text: {
    fontFamily: SERIF,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '500',
  },
  textSmall: {
    fontSize: 16,
    lineHeight: 23,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  author: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
