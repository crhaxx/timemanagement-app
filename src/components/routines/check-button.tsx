import { useState } from 'react';
import { Pressable } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';

import { SymbolIcon } from '@/components/symbol-icon';
import { colors, tint } from '@/constants/colors';
import type { RoutineLogStatus } from '@/types/database';

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

/** Round check-off for a routine's day. Fills on done, greys out on skipped. */
export function CheckButton({
  status,
  onPress,
  size = 40,
  color = colors.routine,
}: {
  status: RoutineLogStatus | null;
  onPress: () => void;
  size?: number;
  color?: string;
}) {
  const [pressed, setPressed] = useState(false);
  const done = status === 'done';
  const filled = done || status === 'skipped';
  const fill = done ? color : colors.muted;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={done ? 'Zrušit hotovo' : 'Označit jako hotové'}
      hitSlop={10}
      pressRetentionOffset={16}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderColor: filled ? fill : tint(color, 0.5),
          backgroundColor: filled ? fill : tint(color, 0.08),
          transform: [{ scale: pressed ? 0.9 : 1 }],
          transitionProperty: ['transform', 'backgroundColor', 'borderColor'],
          transitionDuration: '140ms',
          transitionTimingFunction: EASE_OUT,
        }}>
        <Animated.View
          style={{
            opacity: filled ? 1 : 0,
            transform: [{ scale: filled ? 1 : 0.6 }],
            transitionProperty: ['opacity', 'transform'],
            transitionDuration: '180ms',
            transitionTimingFunction: EASE_OUT,
          }}>
          <SymbolIcon
            name={status === 'skipped' ? 'skip' : 'checkmark'}
            color="#FFFFFF"
            size={Math.round(size * 0.42)}
            weight="bold"
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
