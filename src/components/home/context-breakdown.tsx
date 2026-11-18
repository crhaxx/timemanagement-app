import { StyleSheet, Text, View } from 'react-native';

import { Card, Eyebrow } from '@/components/ui';
import { colors } from '@/constants/colors';
import { contextMeta, useFocusAreas } from '@/lib/focus-areas';

/** One segmented bar showing where the open tasks sit, the way iOS shows storage. */
export function ContextBreakdown({ items }: { items: { ctx: string; count: number }[] }) {
  const { areas } = useFocusAreas();
  return (
    <Card style={styles.card}>
      <Eyebrow>Úkoly podle kontextu</Eyebrow>
      <View style={styles.bar}>
        {items.map(({ ctx, count }) => (
          <View key={ctx} style={{ flex: count, backgroundColor: contextMeta(ctx, areas).color }} />
        ))}
      </View>
      <View style={styles.legend}>
        {items.map(({ ctx, count }) => (
          <View key={ctx} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: contextMeta(ctx, areas).color }]} />
            <Text style={styles.label}>{contextMeta(ctx, areas).label}</Text>
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
