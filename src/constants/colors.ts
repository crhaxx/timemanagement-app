export const palette = {
  blue: '#007AFF',
  indigo: '#5856D6',
  purple: '#AF52DE',
  pink: '#FF2D55',
  red: '#FF3B30',
  orange: '#FF9500',
  yellow: '#FFCC00',
  green: '#34C759',
  teal: '#30B0C7',
  gray: '#8E8E93',
} as const;

export const colors = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceRaised: '#F2F2F7',
  fill: 'rgba(120, 120, 128, 0.12)',
  fillStrong: 'rgba(120, 120, 128, 0.2)',
  separator: 'rgba(60, 60, 67, 0.14)',
  border: 'rgba(60, 60, 67, 0.12)',
  text: '#000000',
  muted: '#8E8E93',
  secondary: 'rgba(60, 60, 67, 0.6)',
  tertiary: 'rgba(60, 60, 67, 0.3)',
  accent: palette.blue,
  accentSoft: 'rgba(0, 122, 255, 0.12)',
  accentText: '#FFFFFF',
  danger: palette.red,
  success: palette.green,
  low: palette.gray,
  medium: palette.blue,
  high: palette.orange,
  urgent: palette.red,
  goal: palette.purple,
  task: palette.blue,
  journal: palette.orange,
  routine: palette.teal,
  /** Near-black surface for the single most important card on a screen. */
  ink: '#1C1C1E',
  inkText: '#FFFFFF',
  inkSecondary: 'rgba(235, 235, 245, 0.64)',
  inkFill: 'rgba(120, 120, 128, 0.34)',
} as const;

/** System colors as they appear on the `ink` surface. */
export const onInk = {
  teal: '#40C8E0',
  green: '#30D158',
  orange: '#FF9F0A',
  red: '#FF453A',
  separator: 'rgba(235, 235, 245, 0.16)',
} as const;

/** Returns `hex` with the given opacity, e.g. a soft tinted background for an icon. */
export function tint(hex: string, alpha = 0.14) {
  const channel = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${channel}`;
}
