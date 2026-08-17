import type { DateKey, Weekday } from "@/types";

/**
 * All date handling here is deliberately local-timezone based.
 *
 * `new Date().toISOString().slice(0, 10)` is the classic bug: for anyone west
 * of UTC it returns *tomorrow* after ~17:00 local. Every key in this app is
 * built from `getFullYear/getMonth/getDate`, which read local calendar fields.
 */

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

/** Local `YYYY-MM-DD` for a Date. */
export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parse `YYYY-MM-DD` into a Date at local midnight. */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): DateKey {
  return toDateKey(new Date());
}

export function isValidDateKey(key: unknown): key is DateKey {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const d = fromDateKey(key);
  return !Number.isNaN(d.getTime()) && toDateKey(d) === key;
}

/** Local midnight today — the reference point for "is this the future?". */
export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function isFuture(key: DateKey): boolean {
  return fromDateKey(key).getTime() > startOfToday().getTime();
}

export function isToday(key: DateKey): boolean {
  return key === todayKey();
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function shiftKey(key: DateKey, days: number): DateKey {
  return toDateKey(addDays(fromDateKey(key), days));
}

/** Whole days between two keys (b - a). */
export function daysBetween(a: DateKey, b: DateKey): number {
  const MS_PER_DAY = 86_400_000;
  // Use UTC-normalised values so DST transitions don't produce 23/25h days.
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const au = Date.UTC(ay, am - 1, ad);
  const bu = Date.UTC(by, bm - 1, bd);
  return Math.round((bu - au) / MS_PER_DAY);
}

export function getWeekday(key: DateKey): Weekday {
  return fromDateKey(key).getDay() as Weekday;
}

/** Every local date key in a year, Jan 1 → Dec 31. */
export function daysInYear(year: number): DateKey[] {
  const keys: DateKey[] = [];
  const cursor = new Date(year, 0, 1);
  while (cursor.getFullYear() === year) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Every date key in a given month (month is 0-indexed). */
export function daysInMonthKeys(year: number, month: number): DateKey[] {
  const total = daysInMonth(year, month);
  const keys: DateKey[] = [];
  for (let d = 1; d <= total; d++) keys.push(`${year}-${pad(month + 1)}-${pad(d)}`);
  return keys;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

/** Single-letter weekday labels for the schedule picker, starting Sunday. */
export const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"] as const;

/** "Monday, August 17" */
export function formatLongDate(key: DateKey): string {
  const d = fromDateKey(key);
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

/** "AUGUST 17" */
export function formatHeroDate(key: DateKey): string {
  const d = fromDateKey(key);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

/** "Aug 17" */
export function formatShortDate(key: DateKey): string {
  const d = fromDateKey(key);
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/**
 * Weekday order for calendar headers, respecting the week-start setting.
 * `weekStartsOn: 1` → [1,2,3,4,5,6,0].
 */
export function weekdayOrder(weekStartsOn: 0 | 1): Weekday[] {
  const base: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
  return [...base.slice(weekStartsOn), ...base.slice(0, weekStartsOn)];
}

/** Monday-or-Sunday-anchored start of the week containing `key`. */
export function startOfWeek(key: DateKey, weekStartsOn: 0 | 1): DateKey {
  const day = getWeekday(key);
  const diff = (day - weekStartsOn + 7) % 7;
  return shiftKey(key, -diff);
}

/** ISO-ish week identifier used to group `timesPerWeek` habits. */
export function weekId(key: DateKey, weekStartsOn: 0 | 1): string {
  return startOfWeek(key, weekStartsOn);
}
