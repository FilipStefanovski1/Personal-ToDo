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
  /**
   * Optional flavours of this habit — Gym → Push / Pull / Legs. When set,
   * completing the habit offers them as a follow-up; picking one is never
   * required, so a completion is always still a single tap.
   */
  variants?: string[];
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

/** Free-text day notes, indexed by date. Empty notes are never stored. */
export type NoteMap = Record<DateKey, string>;

/**
 * Which variant of a habit was done on a day: `{ "2026-08-17": { gym: "Push" } }`.
 *
 * Deliberately a side table rather than a field on the completion record.
 * Completions are the most precious data in the app and stay exactly as they
 * were — a bare list of habit ids — so this feature carries no migration risk
 * to them. An orphaned variant is inert: nothing reads it unless the matching
 * completion exists.
 */
export type VariantMap = Record<DateKey, Record<string, string>>;

/** Cap on a habit's variant list — a picker, not a taxonomy. */
export const MAX_VARIANTS = 8;
export const MAX_VARIANT_LENGTH = 20;

/** Longest note we'll store. Generous for a line or two, bounded for storage. */
export const MAX_NOTE_LENGTH = 500;

/**
 * A moment worth remembering — "Shipped Aminta v1", "Ran first 10K".
 *
 * Deliberately separate from day notes rather than a flag on one. A note is
 * "what happened today", written often and read a month later; a moment is
 * rare, titled, and belongs to the *year's* story. Merging them would mean
 * every note needing an is-this-important flag, and every moment carrying a
 * field it doesn't want. Both are keyed by date, so a day can have either or
 * both.
 */
export interface Moment {
  id: string;
  date: DateKey;
  title: string;
  emoji: string;
}

export const MAX_MOMENT_TITLE_LENGTH = 80;

/**
 * What a goal counts. A goal *references* data; it never owns it. Deleting a
 * goal can never touch a completion, and editing one can never rewrite
 * history — progress is always recomputed from the underlying records.
 */
export type GoalSource =
  /** Days this habit was completed. */
  | { type: "habit"; habitId: string }
  /** Days this category had at least one completion — its active days. */
  | { type: "category"; categoryId: string };

/**
 * The window a goal is measured over.
 *
 * Deliberately no weekly or monthly *recurring* periods: `timesPerWeek` habit
 * schedules and the week strip already answer "gym 3× a week", and a rolling
 * goal would produce 52 separate results a year to store and display. A goal
 * here is a single named stretch of time with one result.
 */
export type GoalPeriod =
  | { type: "year"; year: number }
  | { type: "custom"; from: DateKey; to: DateKey }
  /** Runs from a date with no end — lifetime totals. */
  | { type: "ongoing"; from: DateKey };

export interface Goal {
  id: string;
  /** Optional; falls back to a label derived from source, target and period. */
  name: string;
  source: GoalSource;
  target: number;
  period: GoalPeriod;
  /** Hidden from the active list but kept in history. */
  archived: boolean;
  createdAt: string;
}

export type GoalStatus =
  /** The period includes today and the target hasn't been reached. */
  | "active"
  /** Target reached — stays in history rather than disappearing. */
  | "completed"
  /** The period is over and the target wasn't reached. Not a failure, a result. */
  | "ended";

/** A threshold crossed on a particular day. */
export interface GoalMilestone {
  /** The count this milestone marks — 25, 50, 75… */
  value: number;
  /** The day the count was first reached. */
  date: DateKey;
  /** True for the milestone that equals the goal's target. */
  isTarget: boolean;
}

export interface GoalProgress {
  goal: Goal;
  status: GoalStatus;
  /** Completions counted inside the period, as of today. */
  current: number;
  target: number;
  /** 0–100, clamped. */
  percent: number;
  /** First day of the period. */
  from: DateKey;
  /** Last day, or null for an ongoing goal. */
  to: DateKey | null;
  /** Days elapsed, and total — null when the goal has no end. */
  daysElapsed: number;
  daysTotal: number | null;
  daysRemaining: number | null;
  /**
   * Where a steady pace would put you today. Null for ongoing goals and for
   * periods that haven't started, where pace is meaningless rather than zero.
   */
  expected: number | null;
  /** current − expected, when pace applies. */
  paceDelta: number | null;
  /** The day the target was reached, when it was. */
  completedOn: DateKey | null;
  milestones: GoalMilestone[];
}

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
  /**
   * Dates marked as a sick day. On a sick day, every category's goal is
   * excused — nothing is "due", so nothing can be missed, and streaks and
   * consistency figures skip the day entirely rather than counting it as a
   * failure. Anything actually completed that day still counts as a real
   * completion; only the *requirement* is waived.
   */
  sickDays: DateKey[];
  /**
   * A short free-text note per date. This is what makes a year worth looking
   * back at: completions record *that* something happened, notes record
   * *what* — "squat PR", "Solana event", "felt wrecked". Optional by design;
   * nothing in the app ever asks for one.
   */
  notes: NoteMap;
  /** Which variant was logged, per habit per day. See `VariantMap`. */
  variants: VariantMap;
  /** Targets measured against the records above. See `GoalSource`. */
  goals: Goal[];
  /** Hand-written moments worth remembering. See `Moment`. */
  moments: Moment[];
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
  sickDays: DateKey[];
  notes: NoteMap;
  variants: VariantMap;
  goals: Goal[];
  moments: Moment[];
  settings: AppSettings;
}

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  /** `timesPerWeek` habits streak in weeks; everything else in days. */
  streakUnit: "days" | "weeks";
  /** 0–100, over scheduled days since tracking began. */
  completionRate: number;
  /** False when no day has finished yet — show an empty state, not 0%. */
  hasRate: boolean;
  completedThisMonth: number;
  completedThisYear: number;
  totalCompleted: number;
  /** Counts per variant this year, most-used first. Empty when unused. */
  variantCounts: Array<{ variant: string; count: number }>;
}

/**
 * Category-level numbers. Which of these are worth showing depends on the
 * goal type — an "any" category cares about active days and its most common
 * item, an "all" category cares about perfect days.
 */
export interface CategoryStats {
  goalType: GoalType;
  /** Completions recorded across this category's items — 0 means no data yet. */
  totalCompletions: number;
  /** Days the category's goal was met. */
  goalDaysThisMonth: number;
  goalDaysThisYear: number;
  /**
   * Days this category actually had a daily goal to hit. Zero for a category
   * measured per week (its items are all `timesPerWeek`), where a *daily*
   * streak would be a category error rather than a real number.
   */
  judgedDays: number;
  /** Consecutive days meeting the goal, counting back from today. */
  currentStreak: number;
  longestStreak: number;
  /** Mean share of due items completed, 0–100, across completed days. */
  averageCompletion: number;
  /**
   * False when no day has finished yet (today is excluded while in progress),
   * so the UI shows an empty state instead of a meaningless 0%.
   */
  hasAverage: boolean;
  /** For "any" categories: the item logged most often this year. */
  topHabitName: string | null;
  topHabitCount: number;
}
