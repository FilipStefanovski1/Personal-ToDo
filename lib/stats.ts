import type {
  Category,
  CategoryStats,
  CompletionMap,
  DateKey,
  Habit,
  HabitStats,
} from "@/types";
import { categoryProgress } from "./categories";
import {
  daysBetween,
  fromDateKey,
  shiftKey,
  startOfWeek,
  toDateKey,
  todayKey,
} from "./dates";
import { isScheduledDay } from "./schedule";

/**
 * The first date on which any of `habitIds` was recorded, or null if none ever
 * was.
 *
 * Rates are measured from here rather than from a habit's `createdAt`. Creating
 * a habit is not the same as starting to track it — anchoring on `createdAt`
 * would count every day between as a miss and report a demoralising 0% to
 * someone on their first day. Gaps *after* you start still count against you,
 * which is the honest part.
 */
export function firstRecordedDate(
  completions: CompletionMap,
  habitIds: Set<string>,
): DateKey | null {
  let earliest: DateKey | null = null;
  for (const [date, ids] of Object.entries(completions)) {
    if (!ids.some((id) => habitIds.has(id))) continue;
    if (earliest === null || date < earliest) earliest = date;
  }
  return earliest;
}

/** Fast membership lookup used by every stat below. */
export function makeCompletionLookup(completions: CompletionMap) {
  const index = new Map<DateKey, Set<string>>();
  for (const [date, ids] of Object.entries(completions)) {
    index.set(date, new Set(ids));
  }
  return (habitId: string, date: DateKey) => index.get(date)?.has(habitId) ?? false;
}

/**
 * Every date from the day this habit was first recorded through today.
 *
 * Anchored on the first completion rather than `createdAt` — see
 * `firstRecordedDate`. Returns just today when nothing has been recorded yet,
 * so a brand-new habit reports zeroes rather than a long run of misses.
 */
function habitDateRange(
  habit: Habit,
  completions: CompletionMap,
  upTo: DateKey,
): DateKey[] {
  const anchor = firstRecordedDate(completions, new Set([habit.id]));
  if (anchor === null) return [upTo];
  const span = daysBetween(anchor, upTo);
  if (span < 0) return [upTo];
  const keys: DateKey[] = [];
  for (let i = 0; i <= span; i++) keys.push(shiftKey(anchor, i));
  return keys;
}

function dayStreaks(
  habit: Habit,
  dates: DateKey[],
  isDone: (habitId: string, date: DateKey) => boolean,
  today: DateKey,
) {
  let longest = 0;
  let running = 0;
  // `current` is the streak that is still alive as of today.
  let current = 0;

  for (const date of dates) {
    if (!isScheduledDay(habit.schedule, date)) continue; // off-days don't break it
    if (isDone(habit.id, date)) {
      running++;
      longest = Math.max(longest, running);
    } else if (date === today) {
      // Today being unchecked shouldn't retroactively kill yesterday's streak —
      // the day isn't over yet. Keep `running` intact.
    } else {
      running = 0;
    }
  }
  current = running;
  return { current, longest };
}

function weekStreaks(
  habit: Habit,
  dates: DateKey[],
  isDone: (habitId: string, date: DateKey) => boolean,
  weekStartsOn: 0 | 1,
  today: DateKey,
) {
  const target =
    habit.schedule.type === "timesPerWeek" ? habit.schedule.timesPerWeek : 1;

  const perWeek = new Map<string, number>();
  for (const date of dates) {
    if (!isDone(habit.id, date)) continue;
    const wk = startOfWeek(date, weekStartsOn);
    perWeek.set(wk, (perWeek.get(wk) ?? 0) + 1);
  }

  const weeks = [...new Set(dates.map((d) => startOfWeek(d, weekStartsOn)))].sort();
  const currentWeek = startOfWeek(today, weekStartsOn);

  let longest = 0;
  let running = 0;
  for (const wk of weeks) {
    const hit = (perWeek.get(wk) ?? 0) >= target;
    if (hit) {
      running++;
      longest = Math.max(longest, running);
    } else if (wk === currentWeek) {
      // The in-progress week can still be completed; don't break the streak.
    } else {
      running = 0;
    }
  }
  return { current: running, longest };
}

export function computeHabitStats(
  habit: Habit,
  completions: CompletionMap,
  weekStartsOn: 0 | 1,
  isDone = makeCompletionLookup(completions),
): HabitStats {
  const today = todayKey();
  const dates = habitDateRange(habit, completions, today);
  const year = today.slice(0, 4);
  const month = today.slice(0, 7);

  let totalCompleted = 0;
  let completedThisMonth = 0;
  let completedThisYear = 0;
  let scheduledDays = 0;
  let scheduledDone = 0;

  for (const date of dates) {
    const done = isDone(habit.id, date);
    if (done) {
      totalCompleted++;
      if (date.startsWith(year)) completedThisYear++;
      if (date.startsWith(month)) completedThisMonth++;
    }
    if (isScheduledDay(habit.schedule, date)) {
      // Today is excluded from the denominator until it's over, so an
      // unchecked morning doesn't visibly dent the rate.
      if (date !== today) {
        scheduledDays++;
        if (done) scheduledDone++;
      }
    }
  }

  const weekly = habit.schedule.type === "timesPerWeek";

  // Whether any finished day has been judged; today is excluded while it runs.
  const hasRate = weekly ? totalCompleted > 0 : scheduledDays > 0;

  let completionRate: number;
  if (weekly) {
    const target = habit.schedule.type === "timesPerWeek" ? habit.schedule.timesPerWeek : 1;
    const weeksElapsed = Math.max(1, Math.ceil(dates.length / 7));
    completionRate = Math.min(100, Math.round((totalCompleted / (weeksElapsed * target)) * 100));
  } else {
    completionRate = scheduledDays === 0 ? 0 : Math.round((scheduledDone / scheduledDays) * 100);
  }

  const streaks = weekly
    ? weekStreaks(habit, dates, isDone, weekStartsOn, today)
    : dayStreaks(habit, dates, isDone, today);

  return {
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    streakUnit: weekly ? "weeks" : "days",
    completionRate,
    hasRate,
    completedThisMonth,
    completedThisYear,
    totalCompleted,
  };
}

/**
 * Category numbers, all derived from the children's completions — nothing
 * about a category is ever stored in the history.
 *
 * "Goal met" means whatever the category's goal type says: every due item for
 * `all`, at least one for `any`, at least N for `custom`.
 */
export function computeCategoryStats(
  category: Category,
  habitsInCategory: Habit[],
  completions: CompletionMap,
  isDone = makeCompletionLookup(completions),
): CategoryStats {
  const today = todayKey();
  const live = habitsInCategory.filter((h) => !h.archived);
  const year = today.slice(0, 4);
  const month = today.slice(0, 7);

  const empty: CategoryStats = {
    goalType: category.goalType,
    totalCompletions: 0,
    goalDaysThisMonth: 0,
    goalDaysThisYear: 0,
    currentStreak: 0,
    longestStreak: 0,
    averageCompletion: 0,
    hasAverage: false,
    topHabitName: null,
    topHabitCount: 0,
  };
  if (live.length === 0) return empty;

  // Walk from the day tracking actually started, not from habit creation.
  const anchor = firstRecordedDate(completions, new Set(live.map((h) => h.id)));
  if (anchor === null) return empty;
  const span = daysBetween(anchor, today);
  if (span < 0) return empty;

  let goalDaysThisMonth = 0;
  let goalDaysThisYear = 0;
  let ratioSum = 0;
  let ratioDays = 0;
  let longestStreak = 0;
  let running = 0;
  let currentStreak = 0;
  let totalCompletions = 0;

  const perHabitCounts = new Map<string, number>();

  for (let i = 0; i <= span; i++) {
    const date = shiftKey(anchor, i);
    const progress = categoryProgress(category, live, date, isDone);
    if (progress.due.length === 0) continue;

    totalCompletions += progress.completed.length;
    for (const habit of progress.completed) {
      if (date.startsWith(year)) {
        perHabitCounts.set(habit.id, (perHabitCounts.get(habit.id) ?? 0) + 1);
      }
    }

    if (progress.goalMet) {
      if (date.startsWith(month)) goalDaysThisMonth++;
      if (date.startsWith(year)) goalDaysThisYear++;
      running++;
      longestStreak = Math.max(longestStreak, running);
    } else if (date !== today) {
      // Today is still in progress, so an unmet goal doesn't break the streak.
      running = 0;
    }

    // Today is excluded from the average until it's over.
    if (date !== today) {
      ratioSum += progress.completed.length / progress.due.length;
      ratioDays++;
    }
  }
  currentStreak = running;

  let topHabitName: string | null = null;
  let topHabitCount = 0;
  for (const [habitId, count] of perHabitCounts) {
    if (count > topHabitCount) {
      topHabitCount = count;
      topHabitName = live.find((h) => h.id === habitId)?.name ?? null;
    }
  }

  return {
    goalType: category.goalType,
    totalCompletions,
    goalDaysThisMonth,
    goalDaysThisYear,
    currentStreak,
    longestStreak,
    averageCompletion: ratioDays === 0 ? 0 : Math.round((ratioSum / ratioDays) * 100),
    hasAverage: ratioDays > 0,
    topHabitName,
    topHabitCount,
  };
}

export interface YearSummary {
  year: number;
  totalCompletions: number;
  consistency: number;
  /** False when nothing has been judged yet — show an empty state, not 0%. */
  hasConsistency: boolean;
  /** Null until there's enough history for the comparison to mean anything. */
  bestMonth: string | null;
  bestMonthCount: number;
  overallStreak: number;
  activeDays: number;
}

/**
 * Naming a "best" month needs at least two months to compare. Before that the
 * answer is just "the only month you've used the app", which tells you nothing.
 */
const MIN_MONTHS_FOR_BEST = 2;

/**
 * Headline numbers for the Year view. `consistency` is completions divided by
 * everything that was actually scheduled across all active habits, so adding a
 * new habit mid-year doesn't unfairly punish the earlier months.
 */
export function computeYearSummary(
  categories: Category[],
  habits: Habit[],
  completions: CompletionMap,
  year: number,
): YearSummary {
  const isDone = makeCompletionLookup(completions);
  const today = todayKey();
  const monthCounts = new Array(12).fill(0);

  let totalCompletions = 0;
  const activeDaySet = new Set<DateKey>();

  for (const [date, ids] of Object.entries(completions)) {
    if (!date.startsWith(String(year))) continue;
    const relevant = ids.filter((id) => habits.some((h) => h.id === id));
    if (relevant.length === 0) continue;
    totalCompletions += relevant.length;
    monthCounts[Number(date.slice(5, 7)) - 1] += relevant.length;
    activeDaySet.add(date);
  }

  // Consistency is judged per category goal, not per habit: an "any" group is
  // satisfied by one activity, so counting every unchecked item as a miss
  // would punish exactly the behaviour the goal type exists to allow.
  let goalDays = 0;
  let judgedDays = 0;
  const end = today.startsWith(String(year)) ? today : `${year}-12-31`;

  for (const category of categories) {
    const inCategory = habits.filter((h) => h.categoryId === category.id && !h.archived);
    if (inCategory.length === 0) continue;

    // Judge only from the day this category was first tracked. Nothing was
    // missed before you started.
    const anchor = firstRecordedDate(completions, new Set(inCategory.map((h) => h.id)));
    if (anchor === null) continue;
    const start = anchor > `${year}-01-01` ? anchor : `${year}-01-01`;
    const span = daysBetween(start, end);
    if (span < 0) continue;

    for (let i = 0; i <= span; i++) {
      const date = shiftKey(start, i);
      if (date === today) continue;
      const progress = categoryProgress(category, inCategory, date, isDone);
      if (progress.due.length === 0) continue;
      judgedDays++;
      if (progress.goalMet) goalDays++;
    }
  }

  const bestIndex = monthCounts.reduce(
    (best, count, i) => (count > monthCounts[best] ? i : best),
    0,
  );
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const monthsWithData = monthCounts.filter((count) => count > 0).length;
  const bestMonthIsMeaningful =
    monthsWithData >= MIN_MONTHS_FOR_BEST && monthCounts[bestIndex] > 0;

  return {
    year,
    totalCompletions,
    consistency: judgedDays === 0 ? 0 : Math.round((goalDays / judgedDays) * 100),
    hasConsistency: judgedDays > 0,
    bestMonth: bestMonthIsMeaningful ? MONTHS[bestIndex] : null,
    bestMonthCount: bestMonthIsMeaningful ? monthCounts[bestIndex] : 0,
    overallStreak: computeOverallStreak(categories, habits, completions),
    activeDays: activeDaySet.size,
  };
}

/**
 * Consecutive days on which *every* category met its own goal, counting back
 * from today. Today only breaks the streak once it's over, so a fresh morning
 * doesn't read as a reset.
 *
 * Judging by category goal rather than by every individual habit is what makes
 * this number reachable: one basketball session satisfies Activity, exactly as
 * an "any" group is meant to work.
 */
export function computeOverallStreak(
  categories: Category[],
  habits: Habit[],
  completions: CompletionMap,
): number {
  const liveCategories = categories.filter((c) => !c.archived);
  if (liveCategories.length === 0) return 0;

  const isDone = makeCompletionLookup(completions);
  const today = todayKey();
  let streak = 0;

  for (let offset = 0; offset < 3650; offset++) {
    const date = shiftKey(today, -offset);
    let judged = 0;
    let met = 0;

    for (const category of liveCategories) {
      const inCategory = habits.filter(
        (h) =>
          h.categoryId === category.id &&
          !h.archived &&
          toDateKey(new Date(h.createdAt)) <= date,
      );
      if (inCategory.length === 0) continue;
      const progress = categoryProgress(category, inCategory, date, isDone);
      if (progress.due.length === 0) continue;
      judged++;
      if (progress.goalMet) met++;
    }

    if (judged === 0) continue; // nothing was due — a neutral day
    if (met === judged) {
      streak++;
    } else if (offset === 0) {
      continue; // today is still in progress
    } else {
      break;
    }
  }
  return streak;
}
