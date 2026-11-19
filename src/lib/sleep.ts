import { formatMinutes } from '@/constants/labels';

/** Human-readable sleep length from generated duration_minutes. */
export function formatSleepDuration(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined || minutes <= 0) return null;
  return formatMinutes(minutes);
}

/** Bedtime for a wake day is usually the previous evening. */
export function bedtimeDateForWake(wakeDate: string, hours: number, minutes: number) {
  const wake = new Date(`${wakeDate}T12:00:00`);
  const bed = new Date(wake);
  bed.setHours(hours, minutes, 0, 0);
  // If bedtime clock is after noon, it belongs to the previous calendar day.
  if (hours >= 12) {
    bed.setDate(bed.getDate() - 1);
  }
  return bed;
}

export function wakeDateTime(wakeDate: string, hours: number, minutes: number) {
  const wake = new Date(`${wakeDate}T12:00:00`);
  wake.setHours(hours, minutes, 0, 0);
  return wake;
}

export function formatClock(date: Date) {
  return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}

export function parseClockFromISO(value: string | null | undefined, fallbackHours: number, fallbackMinutes: number) {
  if (!value) {
    const date = new Date();
    date.setHours(fallbackHours, fallbackMinutes, 0, 0);
    return date;
  }
  return new Date(value);
}
