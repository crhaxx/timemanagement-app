import { colors, palette } from '@/constants/colors';
import type { GoalStatus, TaskPriority } from '@/types/database';

/** Labels for contexts saved before they lived in `focus_areas`. */
type LegacyContext = 'osobni' | 'dibsido' | 'weply' | 'nccore' | 'skola';

export const CONTEXT_COLORS: Record<LegacyContext, string> = {
  osobni: palette.blue,
  dibsido: palette.purple,
  weply: palette.orange,
  nccore: palette.teal,
  skola: palette.green,
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: colors.low,
  medium: colors.medium,
  high: colors.high,
  urgent: colors.urgent,
};

export const PRIORITY_ORDER: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export const CONTEXT_LABELS: Record<LegacyContext, string> = {
  osobni: 'Osobní',
  dibsido: 'Dibsido',
  weply: 'Weply',
  nccore: 'NCCore',
  skola: 'Škola',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Nízká',
  medium: 'Střední',
  high: 'Vysoká',
  urgent: 'Urgentní',
};

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  active: 'Aktivní',
  done: 'Splněno',
  dropped: 'Zrušeno',
};

export function parseDecimal(value: string) {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function numericValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  return parseDecimal(value);
}

export function formatAmount(value: number, unit?: string | null) {
  const formatted = value.toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
  return unit ? `${formatted} ${unit}` : formatted;
}

/** Number with its unit, or the text as written when the value is not a number. */
export function formatGoalValue(value: string | number | null | undefined, unit?: string | null) {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  const numeric = numericValue(raw);
  if (numeric !== null) return formatAmount(numeric, unit);
  const trimmedUnit = unit?.trim();
  if (!trimmedUnit) return raw;
  if (raw.toLocaleLowerCase('cs-CZ').includes(trimmedUnit.toLocaleLowerCase('cs-CZ'))) return raw;
  return `${raw} ${trimmedUnit}`;
}

/** "58 000 Kč z 100 000 Kč" for numbers, "začátečník → expert" for text. */
export function goalStatusLabel(
  current: string | number | null | undefined,
  target: string | number | null | undefined,
  unit?: string | null,
) {
  const currentLabel = formatGoalValue(current, unit);
  const targetLabel = formatGoalValue(target, unit);
  if (!currentLabel && !targetLabel) return null;
  if (currentLabel && targetLabel) {
    const measurable = numericValue(current) !== null && numericValue(target) !== null;
    return measurable ? `${currentLabel} z ${targetLabel}` : `${currentLabel} → ${targetLabel}`;
  }
  return currentLabel || targetLabel;
}

export function formatMinutes(minutes: number) {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? '1 h' : `${hours} h`;
  }
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
