import type { DateKey, Habit, HabitSchedule } from "@/types";
import { DAY_INITIALS, getWeekday, startOfWeek } from "./dates";

/**
 * Whether a habit is expected on a given date.
 *
 * `timesPerWeek` habits are expected *some* days each week but not specific
 * ones, so they're always actionable — the weekly target is what's graded.
 */
export function isHabitDueOn(habit: Habit, key: DateKey): boolean {
  const { schedule } = habit;
  switch (schedule.type) {
    case "daily":
      return true;
    case "weekdays":
      return schedule.days.includes(getWeekday(key));
    case "timesPerWeek":
      return true;
  }
}

/** True when a date counts toward the habit's fixed-day completion rate. */
export function isScheduledDay(schedule: HabitSchedule, key: DateKey): boolean {
  switch (schedule.type) {
    case "daily":
      return true;
    case "weekdays":
      return schedule.days.includes(getWeekday(key));
    case "timesPerWeek":
      return false;
  }
}

/** How many times a `timesPerWeek` habit was completed in `key`'s week. */
export function weeklyProgress(
  habit: Habit,
  key: DateKey,
  isCompleted: (habitId: string, date: DateKey) => boolean,
  weekStartsOn: 0 | 1,
): number {
  const start = startOfWeek(key, weekStartsOn);
  let count = 0;
  const [y, m, d] = start.split("-").map(Number);
  for (let i = 0; i < 7; i++) {
    const cursor = new Date(y, m - 1, d + i);
    const dk = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(
      cursor.getDate(),
    ).padStart(2, "0")}`;
    if (isCompleted(habit.id, dk)) count++;
  }
  return count;
}

/** "Every day", "Mon–Fri", "Mon, Wed, Sat", "4× per week" */
export function describeSchedule(schedule: HabitSchedule): string {
  switch (schedule.type) {
    case "daily":
      return "Every day";
    case "timesPerWeek":
      return `${schedule.timesPerWeek}× per week`;
    case "weekdays": {
      const days = [...schedule.days].sort();
      if (days.length === 7) return "Every day";
      const isWeekdays = days.length === 5 && days.every((d) => d >= 1 && d <= 5);
      if (isWeekdays) return "Mon–Fri";
      const isWeekend = days.length === 2 && days.includes(0) && days.includes(6);
      if (isWeekend) return "Weekends";
      const short = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return days.map((d) => short[d]).join(", ");
    }
  }
}

export { DAY_INITIALS };
