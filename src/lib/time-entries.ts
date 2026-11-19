import type { FocusArea, TimeEntry } from '@/types/database';

export type AreaTimeSummary = {
  focusAreaId: string | null;
  label: string;
  color: string | null;
  actualMinutes: number;
  plannedMinutes: number;
};

/** Sum actual vs planned minutes, grouped by focus area. */
export function summarizeTimeByArea(
  entries: Pick<TimeEntry, 'focus_area_id' | 'duration_minutes' | 'planned_minutes'>[],
  areas: FocusArea[],
): AreaTimeSummary[] {
  const byId = new Map<string | null, AreaTimeSummary>();
  const areaById = new Map(areas.map((area) => [area.id, area]));

  for (const entry of entries) {
    const key = entry.focus_area_id;
    const existing = byId.get(key);
    if (existing) {
      existing.actualMinutes += entry.duration_minutes;
      existing.plannedMinutes += entry.planned_minutes ?? 0;
      continue;
    }
    const area = key ? areaById.get(key) : undefined;
    byId.set(key, {
      focusAreaId: key,
      label: area?.name ?? 'Bez oblasti',
      color: area?.color ?? null,
      actualMinutes: entry.duration_minutes,
      plannedMinutes: entry.planned_minutes ?? 0,
    });
  }

  const order = new Map(areas.map((area, index) => [area.id, index]));
  return [...byId.values()].sort(
    (a, b) =>
      (order.get(a.focusAreaId ?? '') ?? 1000) - (order.get(b.focusAreaId ?? '') ?? 1000) ||
      b.actualMinutes - a.actualMinutes,
  );
}

export function firstDayOfMonth(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

export function firstDayOfYear(iso: string) {
  return `${iso.slice(0, 4)}-01-01`;
}

/** Exclusive end date for a month range starting at `yyyy-mm-01`. */
export function monthEndExclusive(iso: string) {
  const [year, month] = iso.slice(0, 7).split('-').map(Number);
  const next = month === 12 ? new Date(year + 1, 0, 1) : new Date(year, month, 1);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  const d = String(next.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Exclusive end date for a year range starting at `yyyy-01-01`. */
export function yearEndExclusive(iso: string) {
  return `${Number(iso.slice(0, 4)) + 1}-01-01`;
}
