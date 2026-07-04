/**
 * Shared date helpers for the rolling 7-day plan model.
 *
 * All app date logic is anchored to `weeks.start_date` and (when present)
 * `workout_days.workout_date`. Weekday names are display-only — never used
 * for scheduling.
 */

export const IST_TZ = "Asia/Kolkata";

/** Today as a `YYYY-MM-DD` string in IST. */
export function todayIstIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: IST_TZ });
}

/** Parse a `YYYY-MM-DD` string into a UTC-midnight Date (safe for +N-day math). */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

/** Format a Date as `YYYY-MM-DD` (UTC — matches parseIsoDate). */
export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Add N whole days to an ISO date string, returning a new ISO date string. */
export function addDaysIso(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

/** Days from `from` to `to` (inclusive of `from`, exclusive of `to`); can be negative. */
export function daysBetweenIso(from: string, to: string): number {
  const a = parseIsoDate(from).getTime();
  const b = parseIsoDate(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Weekday short label ("Mon" .. "Sun") for an ISO date. Display only. */
export function weekdayShort(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

/** Weekday long label ("Monday" .. "Sunday") for an ISO date. Display only. */
export function weekdayLong(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

/** "Sat · 4 Jul" style label for headers. */
export function shortDateLabel(iso: string): string {
  const d = parseIsoDate(iso);
  const wd = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const day = d.getUTCDate();
  const mo = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  return `${wd} · ${day} ${mo}`;
}

/**
 * Resolve a workout day's calendar date. Prefers the row's own `workout_date`
 * (new rolling-week rows). Falls back to `week.start_date + (day_index - 1)`
 * for legacy rows created before the column existed.
 */
export function dayDateIso(args: {
  workoutDate?: string | null;
  weekStartDate?: string | null;
  dayIndex: number;
}): string | null {
  if (args.workoutDate) return args.workoutDate;
  if (args.weekStartDate) return addDaysIso(args.weekStartDate, Math.max(0, args.dayIndex - 1));
  return null;
}

/**
 * For a diet.days array (indexed 1..7 relative to week start_date), return
 * the array index that corresponds to today. Falls back to 0 when the week
 * has not started yet, or 6 when it has already ended.
 */
export function dietIndexForToday(weekStartIso: string | null | undefined): number {
  if (!weekStartIso) return 0;
  const offset = daysBetweenIso(weekStartIso, todayIstIso());
  return Math.max(0, Math.min(6, offset));
}

/** Maximum allowed offset (in days) from today when the user picks a start date. */
export const MAX_START_DATE_OFFSET_DAYS = 14;

/** Server-side validation for a user-supplied start date. Returns the sanitized ISO. */
export function validateStartDate(input: string | undefined): string {
  const today = todayIstIso();
  if (!input) return today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    throw new Error("Invalid start date");
  }
  const offset = daysBetweenIso(today, input);
  if (offset < 0) throw new Error("Start date cannot be in the past");
  if (offset > MAX_START_DATE_OFFSET_DAYS) {
    throw new Error(`Start date must be within ${MAX_START_DATE_OFFSET_DAYS} days`);
  }
  return input;
}
