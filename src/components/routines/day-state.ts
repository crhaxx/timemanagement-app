import { colors, palette, tint } from '@/constants/colors';
import type { DayState } from '@/lib/routines';

/** One fill per day state, shared by the week dots and the history grid. */
export function dayStateColor(state: DayState) {
  switch (state) {
    case 'done':
      return colors.routine;
    case 'skipped':
      return tint(palette.orange, 0.55);
    case 'missed':
      return tint(palette.red, 0.26);
    default:
      return colors.fill;
  }
}

/** "1 rutina", "3 rutiny", "5 rutin". */
export function czechRoutines(count: number) {
  if (count === 1) return '1 rutina';
  if (count >= 2 && count <= 4) return `${count} rutiny`;
  return `${count} rutin`;
}
