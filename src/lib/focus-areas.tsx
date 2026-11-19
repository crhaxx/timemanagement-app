import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { palette } from '@/constants/colors';
import { CONTEXT_COLORS, CONTEXT_LABELS } from '@/constants/labels';
import { supabase } from '@/lib/supabase';
import type { FocusArea } from '@/types/database';

export const FOCUS_AREA_COLUMNS = 'id, slug, name, color, status, priority, weekly_target_hours';

const FALLBACK_COLORS = [
  palette.blue,
  palette.purple,
  palette.orange,
  palette.teal,
  palette.green,
  palette.pink,
  palette.indigo,
  palette.red,
];

type Store = {
  areas: FocusArea[];
  refresh: () => Promise<void>;
};

const FocusAreasContext = createContext<Store>({ areas: [], refresh: async () => {} });

export function FocusAreasProvider({ children }: { children: ReactNode }) {
  const [areas, setAreas] = useState<FocusArea[]>([]);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('focus_areas')
      .select(FOCUS_AREA_COLUMNS)
      .eq('status', 'active')
      .order('priority', { ascending: true, nullsFirst: false })
      .order('name');
    setAreas(data ?? []);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    void supabase
      .from('focus_areas')
      .select(FOCUS_AREA_COLUMNS)
      .eq('status', 'active')
      .order('priority', { ascending: true, nullsFirst: false })
      .order('name')
      .then(({ data }) => {
        if (!cancelled) setAreas(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <FocusAreasContext.Provider value={{ areas, refresh }}>{children}</FocusAreasContext.Provider>;
}

export function useFocusAreas() {
  return useContext(FocusAreasContext);
}

const legacyLabels: Record<string, string> = CONTEXT_LABELS;
const legacyColors: Record<string, string> = CONTEXT_COLORS;

/** Name and color for a task context, preferring the live focus area. */
export function contextMeta(slug: string, areas: FocusArea[]) {
  const index = areas.findIndex((area) => area.slug === slug);
  if (index >= 0) {
    const area = areas[index];
    const stored = area.color?.startsWith('#') ? area.color : null;
    return {
      label: area.name,
      color: stored ?? legacyColors[slug] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    };
  }
  return {
    label: legacyLabels[slug] ?? slug,
    color: legacyColors[slug] ?? palette.gray,
  };
}

/** Counts per context, ordered the way focus areas are ordered. */
export function contextCounts(slugs: string[], areas: FocusArea[]) {
  const counts = new Map<string, number>();
  for (const slug of slugs) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  const order = new Map(areas.map((area, index) => [area.slug, index]));
  return [...counts.entries()]
    .map(([ctx, count]) => ({ ctx, count }))
    .sort(
      (a, b) => (order.get(a.ctx) ?? 1000) - (order.get(b.ctx) ?? 1000) || a.ctx.localeCompare(b.ctx, 'cs'),
    );
}
