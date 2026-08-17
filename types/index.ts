/**
 * Core domain types.
 *
 * `DateKey` is always a LOCAL calendar date in `YYYY-MM-DD` form. It is never
 * derived from `toISOString()` — see lib/dates.ts for why.
 */
export type DateKey = string;

/** 0 = Sunday … 6 = Saturday, matching `Date.prototype.getDay()`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type HabitSchedule =
  /** Due every single day. */
  | { type: "daily" }
  /** Due only on the listed weekdays. */
  | { type: "weekdays"; days: Weekday[] }
  /** Due N times per week, any days — the week itself is the target. */
  | { type: "timesPerWeek"; timesPerWeek: number };

/**
 * How a category's daily goal is judged from its children.
 *
 * `all`    — every due item must be completed (Supplements).
 * `any`    — at least one item counts as a win (Activity).
 * `custom` — at least `goalTarget` items (Health: 2 of 4).
 */
export type GoalType = "all" | "any" | "custom";

/**
 * A visual grouping of habits. A category is never itself completed — its
 * progress is always derived from its children, so nothing about it is stored
 * in the completion history.
 */
export interface Category {
  id: string;
  name: string;
  order: number;
  goalType: GoalType;
  /** Only meaningful when `goalType === "custom"`. */
  goalTarget: number;
  /** Collapsed in the year grid and habit manager. */
  collapsed: boolean;
  archived: boolean;
}

export interface Habit {
  id: string;
  /** Owning category. Every habit belongs to exactly one. */
  categoryId: string;
  name: string;
  emoji: string;
  /** Hex string, e.g. `#F97316`. Used verbatim as the cell fill. */
  color: string;
  schedule: HabitSchedule;
  /** Ascending; controls display order everywhere. */
  order: number;
  archived: boolean;
  /** ISO timestamp of creation. */
  createdAt: string;
}

/** A single (habit, day) completion. The flat shape used by import/export. */
export interface HabitCompletion {
  habitId: string;
  date: DateKey;
}

/**
 * Completions indexed by date for O(1) toggles and day lookups.
 * `{ "2026-08-17": ["habit_a", "habit_b"] }`
 */
export type CompletionMap = Record<DateKey, string[]>;

export type ThemePreference = "light" | "dark" | "system";
export type CellSize = "sm" | "md" | "lg";

export interface AppSettings {
  theme: ThemePreference;
  /** 0 = Sunday, 1 = Monday. */
  weekStartsOn: 0 | 1;
  cellSize: CellSize;
  showArchived: boolean;
}

export interface AppData {
  /** Schema version, for future migrations. */
  version: number;
  categories: Category[];
  habits: Habit[];
  completions: CompletionMap;
  settings: AppSettings;
}

/** Shape produced by "Export data" and accepted by "Import data". */
export interface ExportBundle {
  app: "habit-year";
  version: number;
  exportedAt: string;
  categories: Category[];
  habits: Habit[];
  completions: HabitCompletion[];
  settings: AppSettings;
}

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  /** `timesPerWeek` habits streak in weeks; everything else in days. */
  streakUnit: "days" | "weeks";
  /** 0–100, over scheduled days since the habit was created. */
  completionRate: number;
  completedThisMonth: number;
  completedThisYear: number;
  totalCompleted: number;
}

/**
 * Category-level numbers. Which of these are worth showing depends on the
 * goal type — an "any" category cares about active days and its most common
 * item, an "all" category cares about perfect days.
 */
export interface CategoryStats {
  goalType: GoalType;
  /** Days the category's goal was met. */
  goalDaysThisMonth: number;
  goalDaysThisYear: number;
  /** Consecutive days meeting the goal, counting back from today. */
  currentStreak: number;
  longestStreak: number;
  /** Mean share of due items completed, 0–100, across days with items due. */
  averageCompletion: number;
  /** For "any" categories: the item logged most often this year. */
  topHabitName: string | null;
  topHabitCount: number;
}
