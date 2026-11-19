import { StyleSheet, Text, View } from 'react-native';

import { SymbolIcon, type AppIconName } from '@/components/symbol-icon';
import { Card, Caption, IconBadge, ui } from '@/components/ui';
import { colors } from '@/constants/colors';

/** Compact entry points for inbox / sleep / time on the home screen. */
export function LifePrompt({
  icon,
  color,
  title,
  caption,
  onPress,
}: {
  icon: AppIconName;
  color: string;
  title: string;
  caption: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.prompt} accessibilityLabel={`${title}. ${caption}`}>
      <IconBadge name={icon} color={color} />
      <View style={ui.flex}>
        <Text style={ui.title}>{title}</Text>
        <Caption numberOfLines={2}>{caption}</Caption>
      </View>
      <SymbolIcon name="chevronRight" color={colors.tertiary} size={13} weight="semibold" />
    </Card>
  );
}

export function LifeTile({
  icon,
  color,
  label,
  value,
  caption,
  onPress,
}: {
  icon: AppIconName;
  color: string;
  label: string;
  value: string | number;
  caption: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.tile} accessibilityLabel={`${label}, ${value}, ${caption}`}>
      <View style={styles.tileTop}>
        <IconBadge name={icon} color={color} />
        <Text style={styles.tileValue}>{value}</Text>
      </View>
      <View>
        <Text style={styles.tileLabel}>{label}</Text>
        <Text style={styles.caption} numberOfLines={1}>
          {caption}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  tile: {
    flex: 1,
    padding: 14,
    gap: 14,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileValue: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  tileLabel: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  caption: {
    color: colors.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
