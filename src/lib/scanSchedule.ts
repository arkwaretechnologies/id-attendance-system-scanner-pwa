import type { ScanSchedule } from '../types/database';

const MANILA_TZ = 'Asia/Manila';

/**
 * Parse Postgres "time without time zone" (e.g. "07:00:00", "17:30:00" or "07:00:00.123456") to minutes since midnight.
 * Ignores any date part if passed (e.g. ISO string).
 */
function timeToMinutes(value: string): number {
  const s = String(value).trim();
  const timePart = s.includes('T') ? s.split('T')[1]?.split(/[Z+]/)[0] ?? s : s;
  const parts = timePart.split(/[:\s.]/).map((p) => parseInt(p, 10) || 0);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  const seconds = parts[2] ?? 0;
  return hours * 60 + minutes + seconds / 60;
}

/**
 * Get time-of-day in Manila for the given date as minutes since midnight.
 * Uses Intl for reliable extraction regardless of locale.
 */
function getManilaMinutes(date: Date): number {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TZ,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10) || 0;
  const h = get('hour');
  const m = get('minute');
  const s = get('second');
  return h * 60 + m + s / 60;
}

export interface CurrentSessionResult {
  schedule: ScanSchedule;
  action: 'time_in' | 'time_out';
}

/**
 * Find which schedule applies at the given time (Manila) and whether the scan should be time_in or time_out.
 * Uses the exact times from the schedule:
 * - "Time in" from schedule.time_in up to (but not including) schedule.time_out.
 * - "Time out" from schedule.time_out until the next schedule's time_in (or end of day).
 */
export function getCurrentSession(
  now: Date,
  schedules: ScanSchedule[]
): CurrentSessionResult | null {
  if (!schedules.length) return null;

  const minutesNow = getManilaMinutes(now);
  const endOfDay = 24 * 60;

  for (let i = 0; i < schedules.length; i++) {
    const schedule = schedules[i];
    const inMin = timeToMinutes(schedule.time_in);
    const outMin = timeToMinutes(schedule.time_out);
    const nextInMin = i + 1 < schedules.length ? timeToMinutes(schedules[i + 1].time_in) : endOfDay;

    const inArrival = minutesNow >= inMin && minutesNow < outMin;
    const inDeparture = minutesNow >= outMin && minutesNow < nextInMin;

    if (inArrival) return { schedule, action: 'time_in' };
    if (inDeparture) return { schedule, action: 'time_out' };
  }
  return null;
}

/**
 * Resolve action for the current moment: time_in or time_out based on scan_schedule.
 * If no schedule matches, returns defaultAction (default 'time_in').
 */
export function getActionFromSchedules(
  schedules: ScanSchedule[],
  defaultAction: 'time_in' | 'time_out' = 'time_in',
  at: Date = new Date()
): 'time_in' | 'time_out' {
  const session = getCurrentSession(at, schedules);
  return session?.action ?? defaultAction;
}
