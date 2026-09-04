import type {
  AppData,
  AppSettings,
  Category,
  CompletionMap,
  DateKey,
  GoalType,
  NoteMap,
  VariantMap,
  Habit,
  HabitSchedule,
  Weekday,
} from "@/types";
import { MAX_NOTE_LENGTH, MAX_VARIANTS, MAX_VARIANT_LENGTH } from "@/types";
import { isValidDateKey } from "./dates";
import { DEFAULT_COLOR, isValidHex } from "./colors";

/**
 * v1 → v2 introduced categories; v1 habits migrate into a fallback group.
 * v2 → v3 removed the first-launch demo history generator; stored data from
 * earlier versions has its generated completions stripped on load.
 * v3 → v4 added sick days; purely additive, so no migration step is needed —
 * data without the field just normalizes to an empty list.
 * v4 → v5 added day notes; also purely additive.
 * v5 → v6 added habit variants (Gym → Push/Pull/Legs). Stored in a side table
 * so the completion records themselves were never touched.
 */
export const SCHEMA_VERSION = 6;

/** Category used for habits that arrive without one (v1 data, sloppy imports). */
export const FALLBACK_CATEGORY_NAME = "Other";

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  weekStartsOn: 1,
  cellSize: "md",
  showArchived: false,
};

/** Cheap unique id — no dependency needed, and collisions are not a concern here. */
export function createId(prefix = "h"): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSchedule(input: unknown): HabitSchedule {
  if (!input || typeof input !== "object") return { type: "daily" };
  const raw = input as Record<string, unknown>;

  if (raw.type === "weekdays") {
    const days = Array.isArray(raw.days)
      ? (raw.days.filter(
          (d) => typeof d === "number" && d >= 0 && d <= 6,
        ) as Weekday[])
      : [];
    // A weekday schedule with no days selected is meaningless; fall back.
    return days.length > 0 ? { type: "weekdays", days: [...new Set(days)].sort() } : { type: "daily" };
  }

  if (raw.type === "timesPerWeek") {
    const n = typeof raw.timesPerWeek === "number" ? Math.round(raw.timesPerWeek) : 3;
    return { type: "timesPerWeek", timesPerWeek: Math.min(7, Math.max(1, n)) };
  }

  return { type: "daily" };
}

function normalizeGoalType(value: unknown): GoalType {
  return value === "any" || value === "custom" ? value : "all";
}

function normalizeCategory(input: unknown, index: number): Category | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const goalType = normalizeGoalType(raw.goalType);
  const rawTarget = typeof raw.goalTarget === "number" ? Math.round(raw.goalTarget) : 1;

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : createId("c"),
    name:
      typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Untitled category",
    order: typeof raw.order === "number" ? raw.order : index,
    goalType,
    goalTarget: Math.max(1, rawTarget),
    collapsed: raw.collapsed === true,
    archived: raw.archived === true,
  };
}

function normalizeHabit(input: unknown, index: number): Habit | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const id = typeof raw.id === "string" && raw.id ? raw.id : createId();
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Untitled habit";
  const color = typeof raw.color === "string" && isValidHex(raw.color) ? raw.color : DEFAULT_COLOR;

  return {
    id,
    // Left blank when absent; `normalizeAppData` assigns the fallback category.
    categoryId: typeof raw.categoryId === "string" ? raw.categoryId : "",
    name,
    emoji: typeof raw.emoji === "string" && raw.emoji ? raw.emoji : "🎯",
    color,
    schedule: normalizeSchedule(raw.schedule),
    variants: normalizeVariantList(raw.variants),
    order: typeof raw.order === "number" ? raw.order : index,
    archived: raw.archived === true,
    createdAt:
      typeof raw.createdAt === "string" && !Number.isNaN(Date.parse(raw.createdAt))
        ? raw.createdAt
        : new Date().toISOString(),
  };
}

/** Drops invalid dates and references to habits that no longer exist. */
export function normalizeCompletions(input: unknown, habitIds: Set<string>): CompletionMap {
  const out: CompletionMap = {};
  if (!input || typeof input !== "object") return out;

  for (const [dateKey, value] of Object.entries(input as Record<string, unknown>)) {
    if (!isValidDateKey(dateKey) || !Array.isArray(value)) continue;
    const ids = [...new Set(value.filter((v): v is string => typeof v === "string" && habitIds.has(v)))];
    if (ids.length > 0) out[dateKey] = ids;
  }
  return out;
}

/** A habit's variant list: trimmed, deduped, bounded. */
export function normalizeVariantList(input: unknown): string[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of input) {
    if (typeof value !== "string") continue;
    const name = value.trim().slice(0, MAX_VARIANT_LENGTH);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= MAX_VARIANTS) break;
  }
  return out.length > 0 ? out : undefined;
}

/** Drops variants on unknown dates or unknown habits. */
export function normalizeVariants(input: unknown, habitIds: Set<string>): VariantMap {
  const out: VariantMap = {};
  if (!input || typeof input !== "object") return out;

  for (const [dateKey, perHabit] of Object.entries(input as Record<string, unknown>)) {
    if (!isValidDateKey(dateKey) || !perHabit || typeof perHabit !== "object") continue;
    const day: Record<string, string> = {};
    for (const [habitId, value] of Object.entries(perHabit as Record<string, unknown>)) {
      if (!habitIds.has(habitId) || typeof value !== "string") continue;
      const name = value.trim().slice(0, MAX_VARIANT_LENGTH);
      if (name) day[habitId] = name;
    }
    if (Object.keys(day).length > 0) out[dateKey] = day;
  }
  return out;
}

/** Trimmed, length-capped notes on valid dates. Empty notes aren't stored. */
export function normalizeNotes(input: unknown): NoteMap {
  const out: NoteMap = {};
  if (!input || typeof input !== "object") return out;

  for (const [dateKey, value] of Object.entries(input as Record<string, unknown>)) {
    if (!isValidDateKey(dateKey) || typeof value !== "string") continue;
    const text = value.trim().slice(0, MAX_NOTE_LENGTH);
    if (text) out[dateKey] = text;
  }
  return out;
}

/** Deduped, valid date keys only — bad entries are dropped, not fatal. */
export function normalizeSickDays(input: unknown): DateKey[] {
  if (!Array.isArray(input)) return [];
  const valid = input.filter((v): v is DateKey => typeof v === "string" && isValidDateKey(v));
  return [...new Set(valid)].sort();
}

function normalizeSettings(input: unknown): AppSettings {
  if (!input || typeof input !== "object") return { ...DEFAULT_SETTINGS };
  const raw = input as Record<string, unknown>;
  return {
    theme:
      raw.theme === "light" || raw.theme === "dark" || raw.theme === "system"
        ? raw.theme
        : DEFAULT_SETTINGS.theme,
    weekStartsOn: raw.weekStartsOn === 0 ? 0 : 1,
    cellSize:
      raw.cellSize === "sm" || raw.cellSize === "md" || raw.cellSize === "lg"
        ? raw.cellSize
        : DEFAULT_SETTINGS.cellSize,
    showArchived: raw.showArchived === true,
  };
}

/**
 * Turns anything (persisted blob, imported file, partial object) into a valid
 * `AppData`. This is the only place untrusted data enters the app.
 */
export function normalizeAppData(input: unknown): AppData {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;

  const categories = (Array.isArray(raw.categories) ? raw.categories : [])
    .map(normalizeCategory)
    .filter((c): c is Category => c !== null)
    .sort((a, b) => a.order - b.order);

  let habits = (Array.isArray(raw.habits) ? raw.habits : [])
    .map(normalizeHabit)
    .filter((h): h is Habit => h !== null)
    .sort((a, b) => a.order - b.order);

  // Migration + repair: any habit whose category is missing or dangling gets
  // parked in a fallback group rather than vanishing from the UI.
  const knownCategoryIds = new Set(categories.map((c) => c.id));
  const orphans = habits.filter((h) => !knownCategoryIds.has(h.categoryId));
  if (orphans.length > 0) {
    let fallback = categories.find((c) => c.name === FALLBACK_CATEGORY_NAME);
    if (!fallback) {
      fallback = {
        id: createId("c"),
        name: FALLBACK_CATEGORY_NAME,
        order: categories.length,
        goalType: "all",
        goalTarget: 1,
        collapsed: false,
        archived: false,
      };
      categories.push(fallback);
    }
    const fallbackId = fallback.id;
    habits = habits.map((h) =>
      knownCategoryIds.has(h.categoryId) ? h : { ...h, categoryId: fallbackId },
    );
  }

  const orderedCategories = categories.map((c, i) => ({ ...c, order: i }));

  // `order` is per-category, so habits sort independently inside each group.
  const orderedHabits: Habit[] = [];
  for (const category of orderedCategories) {
    const inCategory = habits.filter((h) => h.categoryId === category.id);
    orderedHabits.push(...inCategory.map((h, i) => ({ ...h, order: i })));
  }

  const habitIds = new Set(orderedHabits.map((h) => h.id));

  return {
    version: SCHEMA_VERSION,
    categories: orderedCategories,
    habits: orderedHabits,
    completions: normalizeCompletions(raw.completions, habitIds),
    sickDays: normalizeSickDays(raw.sickDays),
    notes: normalizeNotes(raw.notes),
    variants: normalizeVariants(raw.variants, habitIds),
    settings: normalizeSettings(raw.settings),
  };
}
