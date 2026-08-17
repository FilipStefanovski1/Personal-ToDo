import type { Category, DateKey, Habit } from "@/types";
import { isHabitDueOn } from "./schedule";

export interface CategoryProgress {
  /** Items due on this date. */
  due: Habit[];
  /** Items due and completed. */
  completed: Habit[];
  /** How many completions the goal asks for on this date. */
  target: number;
  /** Whether the category's goal was met. */
  goalMet: boolean;
}

/**
 * How many completions a category needs on a given date.
 *
 * `custom` is clamped to what's actually due — asking for 2 of 4 when only one
 * item is scheduled that day would make the goal permanently unreachable.
 */
export function goalTargetOn(category: Category, dueCount: number): number {
  if (dueCount === 0) return 0;
  switch (category.goalType) {
    case "all":
      return dueCount;
    case "any":
      return 1;
    case "custom":
      return Math.min(category.goalTarget, dueCount);
  }
}

/**
 * Category progress is always derived, never stored — the completion history
 * only ever holds individual habit ids.
 */
export function categoryProgress(
  category: Category,
  habitsInCategory: Habit[],
  date: DateKey,
  isDone: (habitId: string, date: DateKey) => boolean,
): CategoryProgress {
  const due = habitsInCategory.filter((h) => !h.archived && isHabitDueOn(h, date));
  const completed = due.filter((h) => isDone(h.id, date));
  const target = goalTargetOn(category, due.length);
  return {
    due,
    completed,
    target,
    goalMet: target > 0 && completed.length >= target,
  };
}

/** "Complete all", "At least one", "2 of 4" */
export function describeGoal(category: Category, dueCount?: number): string {
  switch (category.goalType) {
    case "all":
      return "Complete all";
    case "any":
      return "At least one";
    case "custom":
      return dueCount === undefined
        ? `At least ${category.goalTarget}`
        : `${category.goalTarget} of ${dueCount}`;
  }
}

/**
 * The count shown beside a category header on the Today screen. An "any"
 * category reads better as a tally of what you actually did than as a
 * fraction of things you were never expected to do all of.
 */
export function progressLabel(category: Category, progress: CategoryProgress): string {
  const { due, completed } = progress;
  if (due.length === 0) return "Nothing scheduled";

  switch (category.goalType) {
    case "any": {
      const n = completed.length;
      if (n === 0) return `0 of ${due.length}`;
      return `${n} ${n === 1 ? "activity" : "activities"} today`;
    }
    case "custom":
      return `${completed.length} / ${progress.target}`;
    case "all":
      return `${completed.length} / ${due.length}`;
  }
}

/** Groups habits by category id, preserving each habit's order. */
export function groupByCategory(habits: Habit[]): Map<string, Habit[]> {
  const map = new Map<string, Habit[]>();
  for (const habit of habits) {
    const list = map.get(habit.categoryId);
    if (list) list.push(habit);
    else map.set(habit.categoryId, [habit]);
  }
  for (const list of map.values()) list.sort((a, b) => a.order - b.order);
  return map;
}
