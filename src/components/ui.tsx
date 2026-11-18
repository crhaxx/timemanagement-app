import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SymbolIcon, type AppIconName } from '@/components/symbol-icon';
import { colors, tint } from '@/constants/colors';
import { haptic } from '@/lib/haptics';

export const RADIUS = 20;

/** SF Rounded for large numerals on iOS; other platforms keep the system face. */
export const ROUNDED = Platform.OS === 'ios' ? 'ui-rounded' : undefined;

/** Serif face reserved for quotes, so they read as someone else's voice. */
export const SERIF = Platform.select({ ios: 'ui-serif', android: 'serif', default: 'Georgia' });

/** Soft elevation shared by every white surface. */
export const shadow: ViewStyle =
  Platform.OS === 'ios'
    ? {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 3 },
      }
    : { elevation: 1 };

export function PressableScale({
  children,
  style,
  pressedScale = 0.97,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
}) {
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [
        style,
        pressed && { opacity: 0.85, transform: [{ scale: pressedScale }] },
      ]}>
      {children}
    </Pressable>
  );
}

export function Card({
  children,
  onPress,
  clip,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  clip?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const body = clip ? <View style={styles.clip}>{children}</View> : children;

  if (onPress) {
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        pressedScale={0.985}
        style={[styles.card, style]}>
        {body}
      </PressableScale>
    );
  }

  return <View style={[styles.card, style]}>{body}</View>;
}

export function Row({
  children,
  onPress,
  onLongPress,
  last,
  inset = 16,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  last?: boolean;
  inset?: number;
  accessibilityLabel?: string;
}) {
  const content = <View style={styles.rowInner}>{children}</View>;

  return (
    <View>
      {onPress || onLongPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={onPress}
          onLongPress={onLongPress}
          style={({ pressed }) => pressed && styles.rowPressed}>
          {content}
        </Pressable>
      ) : (
        content
      )}
      {last ? null : <View style={[styles.separator, { left: inset }]} />}
    </View>
  );
}

export function TintIcon({
  name,
  color,
  size = 36,
}: {
  name: AppIconName;
  color: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        borderCurve: 'continuous',
        backgroundColor: tint(color, 0.14),
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <SymbolIcon name={name} color={color} size={size * 0.5} weight="semibold" />
    </View>
  );
}

/** Solid round badge with a white glyph, the way iOS marks lists and sections. */
export function IconBadge({
  name,
  color,
  size = 34,
}: {
  name: AppIconName;
  color: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <SymbolIcon name={name} color="#FFFFFF" size={Math.round(size * 0.5)} weight="semibold" />
    </View>
  );
}

/** Small uppercase label that names a card or a group. */
export function Eyebrow({ children, style, ...rest }: TextProps) {
  return (
    <Text {...rest} style={[styles.eyebrow, style]}>
      {children}
    </Text>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" hitSlop={10} onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: tint(color, 0.14) }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function ProgressBar({
  value,
  color = colors.accent,
  height = 8,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  const width = `${Math.min(1, Math.max(0, value)) * 100}%` as `${number}%`;
  return (
    <View style={[styles.progressTrack, { height, borderRadius: height / 2 }]}>
      <View
        style={{ width, height: '100%', borderRadius: height / 2, backgroundColor: color }}
      />
    </View>
  );
}

export function Checkbox({
  checked,
  onPress,
  color = colors.accent,
  disabled,
  label,
}: {
  checked: boolean;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={10}
      onPress={onPress}
      style={[styles.checkbox, { borderColor: color }, checked && { backgroundColor: color }]}>
      {checked ? <SymbolIcon name="checkmark" color="#FFFFFF" size={13} weight="bold" /> : null}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  color = colors.accent,
  flat,
  onPress,
}: {
  label: string;
  selected: boolean;
  color?: string;
  /** Filled instead of raised, for chips that sit on a white surface. */
  flat?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        flat && styles.chipFlat,
        selected && { backgroundColor: color },
        pressed && { opacity: 0.7 },
      ]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChoiceGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; color?: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.choiceGroup}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((option) => (
          <Chip
            key={String(option.value)}
            label={option.label}
            color={option.color}
            selected={option.value === value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  color = colors.accent,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  color?: string;
}) {
  const inactive = disabled || loading;
  return (
    <PressableScale
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      pressedScale={0.98}
      style={[styles.primaryButton, { backgroundColor: color }, inactive && { opacity: 0.4 }]}>
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.primaryButtonText}>{title}</Text>
      )}
    </PressableScale>
  );
}

export function TextButton({
  title,
  onPress,
  color = colors.accent,
  disabled,
}: {
  title: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.textButton, (pressed || disabled) && { opacity: 0.4 }]}>
      <Text style={[styles.textButtonText, { color }]}>{title}</Text>
    </Pressable>
  );
}

export function EmptyState({
  icon,
  color = colors.accent,
  title,
  message,
  actionTitle,
  onAction,
}: {
  icon: AppIconName;
  color?: string;
  title: string;
  message: string;
  actionTitle?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <TintIcon name={icon} color={color} size={64} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {actionTitle && onAction ? (
        <View style={styles.emptyAction}>
          <PrimaryButton title={actionTitle} onPress={onAction} color={color} />
        </View>
      ) : null}
    </View>
  );
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{children}</Text>
    </View>
  );
}

export function Caption({ children, style, ...rest }: TextProps) {
  return (
    <Text {...rest} style={[styles.caption, style]}>
      {children}
    </Text>
  );
}

/** Custom header for modal sheets: Cancel · title · primary action. */
export function SheetHeader({
  title,
  saveLabel = 'Uložit',
  cancelLabel = 'Zrušit',
  onCancel,
  onSave,
  canSave = true,
  saving,
}: {
  title: string;
  saveLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onSave?: () => void;
  canSave?: boolean;
  saving?: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.sheetHeader, Platform.OS !== 'ios' && { paddingTop: insets.top + 8 }]}>
      <View style={styles.sheetSide}>
        <TextButton title={cancelLabel} onPress={onCancel} />
      </View>
      <Text style={styles.sheetTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.sheetSide, styles.sheetSideRight]}>
        {onSave ? (
          saving ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <TextButton title={saveLabel} onPress={onSave} disabled={!canSave} />
          )
        ) : null}
      </View>
    </View>
  );
}

export const ui = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 128,
    gap: 16,
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },
  input: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
    paddingVertical: 0,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 24,
  },
  fieldLabel: {
    width: 96,
    color: colors.text,
    fontSize: 17,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  flex: {
    flex: 1,
  },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS,
    borderCurve: 'continuous',
    ...shadow,
  },
  clip: {
    borderRadius: RADIUS,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  rowInner: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowPressed: {
    backgroundColor: colors.fill,
  },
  separator: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
  },
  eyebrow: {
    color: colors.secondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  sectionAction: {
    color: colors.accent,
    fontSize: 15,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderCurve: 'continuous',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    backgroundColor: colors.fill,
    overflow: 'hidden',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: '100%',
    ...shadow,
  },
  chipFlat: {
    backgroundColor: colors.fill,
    shadowOpacity: 0,
    elevation: 0,
  },
  chipText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: colors.accentText,
    fontWeight: '600',
  },
  choiceGroup: {
    gap: 8,
  },
  groupLabel: {
    color: colors.secondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: colors.accentText,
    fontSize: 17,
    fontWeight: '600',
  },
  textButton: {
    paddingVertical: 4,
  },
  textButtonText: {
    fontSize: 17,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyMessage: {
    color: colors.secondary,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyAction: {
    alignSelf: 'stretch',
    marginTop: 16,
  },
  errorBanner: {
    backgroundColor: tint(colors.danger, 0.12),
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 15,
    lineHeight: 20,
  },
  caption: {
    color: colors.secondary,
    fontSize: 15,
    lineHeight: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
  },
  sheetSide: {
    flex: 1,
    alignItems: 'flex-start',
  },
  sheetSideRight: {
    alignItems: 'flex-end',
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
});
