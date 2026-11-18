import { StyleSheet, Text, View } from 'react-native';

import { Card, Eyebrow } from '@/components/ui';
import { colors } from '@/constants/colors';
import { CONTEXT_COLORS, CONTEXT_LABELS } from '@/constants/labels';
import type { TaskContext } from '@/types/database';

/** One segmented bar showing where the open tasks sit, the way iOS shows storage. */
export function ContextBreakdown({ items }: { items: { ctx: TaskContext; count: number }[] }) {
  return (
    <Card style={styles.card}>
      <Eyebrow>Úkoly podle kontextu</Eyebrow>
      <View style={styles.bar}>
        {items.map(({ ctx, count }) => (
          <View key={ctx} style={{ flex: count, backgroundColor: CONTEXT_COLORS[ctx] }} />
        ))}
      </View>
      <View style={styles.legend}>
        {items.map(({ ctx, count }) => (
          <View key={ctx} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: CONTEXT_COLORS[ctx] }]} />
            <Text style={styles.label}>{CONTEXT_LABELS[ctx]}</Text>
            <Text style={styles.count}>{count}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 12,
  },
  bar: {
    flexDirection: 'row',
    height: 10,
    gap: 2,
    borderRadius: 5,
    overflow: 'hidden',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    rowGap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    color: colors.text,
    fontSize: 14,
  },
  count: {
    color: colors.secondary,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
});
