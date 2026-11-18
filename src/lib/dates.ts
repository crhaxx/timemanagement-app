export function localDateISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(iso: string) {
  return new Date(`${iso}T12:00:00`);
}

export function shiftDate(iso: string, days: number) {
  const next = parseLocalDate(iso);
  next.setDate(next.getDate() + days);
  return localDateISO(next);
}

export function formatJournalDate(iso: string) {
  const formatted = parseLocalDate(iso).toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatDeadline(iso: string) {
  return parseLocalDate(iso).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function daysUntil(iso: string) {
  const today = parseLocalDate(localDateISO());
  const target = parseLocalDate(iso);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function addMonths(iso: string, months: number) {
  const next = parseLocalDate(iso);
  next.setMonth(next.getMonth() + months);
  return localDateISO(next);
}

export function czechDays(count: number) {
  const abs = Math.abs(count);
  if (abs === 1) return '1 den';
  if (abs >= 2 && abs <= 4) return `${abs} dny`;
  return `${abs} dní`;
}

/** Short label for a task's planned day: Dnes, Zítra, or a numeric date. */
export function formatTaskWhen(iso: string) {
  const day = iso.slice(0, 10);
  const days = daysUntil(day);
  if (days === 0) return 'Dnes';
  if (days === 1) return 'Zítra';
  if (days === -1) return 'Včera';
  return parseLocalDate(day).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
}

/** Section heading for tasks planned on the same day. */
export function formatTaskHeading(iso: string) {
  const day = iso.slice(0, 10);
  const days = daysUntil(day);
  if (days === 0) return 'Dnes';
  if (days === 1) return 'Zítra';
  if (days === -1) return 'Včera';
  const label = formatJournalDate(day);
  if (days < 0) return `Po termínu · ${label}`;
  return label;
}

export function formatDeadlineLabel(iso: string) {
  const days = daysUntil(iso);
  const date = formatDeadline(iso);
  if (days === 0) return `Dnes · ${date}`;
  if (days === 1) return `Zítra · ${date}`;
  if (days > 1) return `Zbývá ${czechDays(days)} · ${date}`;
  if (days === -1) return `Včera · ${date}`;
  return `Po termínu (${czechDays(days)}) · ${date}`;
}

export function weekdayShort(iso: string) {
  const label = parseLocalDate(iso).toLocaleDateString('cs-CZ', { weekday: 'short' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** ISO weekday: 1=Monday … 7=Sunday. */
export function isoWeekday(iso: string) {
  const day = parseLocalDate(iso).getDay();
  return day === 0 ? 7 : day;
}

export function dayNumber(iso: string) {
  return String(parseLocalDate(iso).getDate());
}

/** Consecutive days with an entry, counting back from today (or yesterday if today is still empty). */
export function currentStreak(dates: Set<string>, today = localDateISO()) {
  let cursor = dates.has(today) ? today : shiftDate(today, -1);
  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}
