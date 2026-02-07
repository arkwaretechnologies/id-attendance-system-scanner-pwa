const MANILA_TZ = 'Asia/Manila';

/**
 * Normalize timestamp for parsing. Handles Postgres format (e.g. space before time,
 * +00 for UTC). Naive strings are treated as UTC so formatTimeManila shows Manila.
 */
function normalizeForManilaDisplay(value: string): string {
  let s = value.trim();
  // Normalize date-time separator so JS parses reliably
  if (/^\d{4}-\d{2}-\d{2}\s+\d/.test(s)) s = s.replace(/\s+/, 'T');

  // Already has timezone: Z or ±HH or ±HH:MM (Postgres can return +00)
  if (/Z$/i.test(s)) return s;
  if (/[-+]\d{1,2}(:?\d{2})?$/.test(s)) {
    if (/\+00$/.test(s)) return s.replace(/\+00$/, '+00:00');
    if (/-00$/.test(s)) return s.replace(/-00$/, '+00:00');
    if (/[+-]\d{1,2}$/.test(s)) return s.replace(/([+-])(\d{1,2})$/, '$1$2:00');
    return s;
  }

  // Naive: assume UTC so display in Manila is correct
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s + 'Z';
  return s;
}

/**
 * Start and end of "today" in Manila (UTC+8) as ISO strings for DB queries.
 */
export function getTodayManilaRange(): { start: string; end: string } {
  const now = new Date();
  const manilaDateStr = now.toLocaleDateString('en-CA', { timeZone: MANILA_TZ });
  const start = new Date(`${manilaDateStr}T00:00:00+08:00`);
  const end = new Date(`${manilaDateStr}T23:59:59.999+08:00`);
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Format a date/time for display in Manila (Philippines) time.
 * Naive timestamp strings (no Z or offset) are assumed to be UTC so display is correct.
 */
export function formatTimeManila(date: Date | string): string {
  const d =
    typeof date === 'string'
      ? new Date(normalizeForManilaDisplay(date))
      : date;
  return d.toLocaleTimeString('en-PH', {
    timeZone: MANILA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Format a Date as date-only in Manila (for SMS, etc.).
 */
export function formatDateManila(date: Date | string): string {
  const d =
    typeof date === 'string'
      ? new Date(normalizeForManilaDisplay(date))
      : date;
  return d.toLocaleDateString('en-PH', { timeZone: MANILA_TZ });
}

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * Format time in Manila (UTC+8) by shifting then formatting in UTC.
 * Use in API routes when Intl timeZone: 'Asia/Manila' may not work (e.g. some Node servers).
 */
export function formatTimeManilaServer(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(normalizeForManilaDisplay(date)) : date;
  const manila = new Date(d.getTime() + MANILA_OFFSET_MS);
  return manila.toLocaleTimeString('en-PH', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Format date in Manila (UTC+8) by shifting then formatting in UTC.
 * Use in API routes when Intl timeZone may not work.
 */
export function formatDateManilaServer(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(normalizeForManilaDisplay(date)) : date;
  const manila = new Date(d.getTime() + MANILA_OFFSET_MS);
  return manila.toLocaleDateString('en-PH', { timeZone: 'UTC' });
}

/**
 * Parse a timestamp string to a Date. Use for API/server when you will format in Manila.
 * Handles Postgres format (space, +00) and naive strings (treated as UTC).
 */
export function parseTimestampToDate(value: string): Date {
  return new Date(normalizeForManilaDisplay(value));
}

/**
 * Current moment as ISO string (for storage). Use when recording time in/out
 * so the DB stores the client's moment; display with formatTimeManila.
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Current date and time in Manila (for live clock display).
 * Same moment as nowISO() but formatted for Asia/Manila.
 */
export function getNowManilaClock(): { time: string; date: string } {
  const d = new Date();
  const time = d.toLocaleTimeString('en-PH', {
    timeZone: MANILA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const date = d.toLocaleDateString('en-PH', {
    timeZone: MANILA_TZ,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return { time, date };
}
