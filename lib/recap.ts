import type {
  Category,
  CompletionMap,
  DateKey,
  GoalProgress,
  Habit,
  Moment,
  NoteMap,
  VariantMap,
  Weekday,
} from "@/types";
import { categoryProgress } from "./categories";
import {
  MONTH_NAMES,
  daysBetween,
  daysInMonth,
  getWeekday,
  shiftKey,
  todayKey,
} from "./dates";
import { firstRecordedDate } from "./stats";
import type { YearSummary } from "./stats";

/**
 * Each category's own anchor date — the first day any of its habits was
 * actually recorded, or null if never. Judging a category before that date
 * would count the gap before you started tracking as a string of misses,
 * exactly the bug `computeYearSummary` already guards against; every walk
 * over category judgement in this file reuses the same anchor.
 */
function categoryAnchors(
  categories: Category[],
  habits: Habit[],
  completions: CompletionMap,
): Map<string, DateKey | null> {
  const anchors = new Map<string, DateKey | null>();
  for (const category of categories) {
    const inCategory = habits.filter((h) => h.categoryId === category.id && !h.archived);
    anchors.set(
      category.id,
      inCategory.length === 0 ? null : firstRecordedDate(completions, new Set(inCategory.map((h) => h.id))),
    );
  }
  return anchors;
}

/** Judged totals for one date, skipping any category not yet anchored by then. */
function judgeDate(
  categories: Category[],
  habits: Habit[],
  date: DateKey,
  isDone: (habitId: string, date: DateKey) => boolean,
  isSick: boolean,
  anchors: Map<string, DateKey | null>,
): { judged: number; met: number } {
  let judged = 0;
  let met = 0;
  for (const category of categories) {
    const anchor = anchors.get(category.id);
    if (anchor === null || anchor === undefined || date < anchor) continue;
    const inCategory = habits.filter((h) => h.categoryId === category.id && !h.archived);
    if (inCategory.length === 0) continue;
    const progress = categoryProgress(category, inCategory, date, isDone, isSick);
    if (!progress.judged) continue;
    judged++;
    if (progress.goalMet) met++;
  }
  return { judged, met };
}

/**
 * The Year Review reads a year back rather than measuring it, so every
 * function here stays a pure reducer over the same records the rest of the
 * app already trusts — `completions`, `notes`, `moments`, `goals`. Nothing is
 * summarised into a stored blob: correct a day in March and the recap for
 * that year is different the next time it's opened, exactly like every other
 * screen in the app.
 */

export interface MonthBreakdown {
  /** 0-indexed. */
  month: number;
  completions: number;
  activeDays: number;
  /** Days a category goal actually applied to, this month. */
  judgedDays: number;
  /** Of `judgedDays`, how many were fully met. */
  goalDays: number;
  /** null when nothing was judged this month. */
  consistency: number | null;
  topHabits: { habitId: string; name: string; color: string; count: number }[];
  noteCount: number;
  momentCount: number;
  milestoneCount: number;
  /** True once the month hasn't started at all within the current year. */
  isFuture: boolean;
}

/**
 * One pass over every day of the year, bucketed by month. Every other recap
 * calculation below reads from this rather than re-walking the year, so the
 * cost of a year of history is paid exactly once.
 */
export function computeMonthlyBreakdown(
  categories: Category[],
  habits: Habit[],
  completions: CompletionMap,
  notes: NoteMap,
  moments: Moment[],
  goalProgress: GoalProgress[],
  year: number,
  sickDays: ReadonlySet<DateKey>,
  today: DateKey = todayKey(),
): MonthBreakdown[] {
  const habitById = new Map(habits.map((h) => [h.id, h]));
  const isDone = (habitId: string, date: DateKey) => (completions[date] ?? []).includes(habitId);
  const anchors = categoryAnchors(categories, habits, completions);

  const momentsByMonth = new Map<number, number>();
  for (const moment of moments) {
    if (!moment.date.startsWith(String(year))) continue;
    const m = Number(moment.date.slice(5, 7)) - 1;
    momentsByMonth.set(m, (momentsByMonth.get(m) ?? 0) + 1);
  }

  const milestonesByMonth = new Map<number, number>();
  for (const progress of goalProgress) {
    for (const milestone of progress.milestones) {
      if (!milestone.date.startsWith(String(year))) continue;
      const m = Number(milestone.date.slice(5, 7)) - 1;
      milestonesByMonth.set(m, (milestonesByMonth.get(m) ?? 0) + 1);
    }
  }

  return Array.from({ length: 12 }, (_, month) => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const firstOfMonth = `${prefix}-01`;
    const isFuture = firstOfMonth > today;

    let completionsTotal = 0;
    let activeDays = 0;
    let judgedDays = 0;
    let goalDays = 0;
    let noteCount = 0;
    const tally = new Map<string, number>();

    if (!isFuture) {
      const length = daysInMonth(year, month);
      for (let day = 1; day <= length; day++) {
        const date = `${prefix}-${String(day).padStart(2, "0")}`;
        if (date > today) break;

        const ids = (completions[date] ?? []).filter((id) => habitById.has(id));
        if (ids.length > 0) {
          activeDays++;
          completionsTotal += ids.length;
          for (const id of ids) tally.set(id, (tally.get(id) ?? 0) + 1);
        }
        if (notes[date]) noteCount++;

        const { judged, met } = judgeDate(categories, habits, date, isDone, sickDays.has(date), anchors);
        // A day with nothing due is neutral — it neither helps nor hurts.
        if (judged > 0) {
          judgedDays++;
          if (judged === met) goalDays++;
        }
      }
    }

    const topHabits = [...tally.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([habitId, count]) => {
        const habit = habitById.get(habitId);
        return { habitId, name: habit?.name ?? "Deleted item", color: habit?.color ?? "#999", count };
      });

    return {
      month,
      completions: completionsTotal,
      activeDays,
      judgedDays,
      goalDays,
      consistency: judgedDays === 0 ? null : Math.round((goalDays / judgedDays) * 100),
      topHabits,
      noteCount,
      momentCount: momentsByMonth.get(month) ?? 0,
      milestoneCount: milestonesByMonth.get(month) ?? 0,
      isFuture,
    };
  });
}

export interface StrongestMonth {
  month: number;
  consistency: number;
  completions: number;
  topHabits: MonthBreakdown["topHabits"];
}

/**
 * The month that stood out, by consistency rather than raw volume — a month
 * with a lot of completions but a broken streak isn't the "strongest" one.
 * Needs at least two judged months to name a winner, same rule as everywhere
 * else a "best" is claimed in this app.
 */
export function strongestMonth(breakdown: MonthBreakdown[]): StrongestMonth | null {
  const judged = breakdown.filter((m) => m.consistency !== null);
  if (judged.length < 2) return null;

  const best = judged.reduce((a, b) => {
    if (b.consistency! !== a.consistency!) return b.consistency! > a.consistency! ? b : a;
    return b.completions > a.completions ? b : a;
  });

  return {
    month: best.month,
    consistency: best.consistency!,
    completions: best.completions,
    topHabits: best.topHabits,
  };
}

export interface WeekdayPattern {
  weekday: Weekday;
  activeDays: number;
  /** How many times this weekday has occurred so far this year. */
  occurrences: number;
  /** activeDays / occurrences, 0 when the weekday hasn't occurred yet. */
  rate: number;
}

/**
 * Which day of the week you actually show up on, normalised by how many
 * times that weekday has happened so far — otherwise a year with 53 Mondays
 * and 52 Sundays would tilt the answer for no real reason.
 */
export function weekdayPattern(
  habits: Habit[],
  completions: CompletionMap,
  year: number,
  today: DateKey = todayKey(),
): WeekdayPattern[] {
  const habitIds = new Set(habits.map((h) => h.id));
  const occurrences = new Array(7).fill(0);
  const active = new Array(7).fill(0);

  const from = `${year}-01-01`;
  const end = today.startsWith(String(year)) ? today : `${year}-12-31`;
  const span = daysBetween(from, end);
  if (span >= 0) {
    for (let i = 0; i <= span; i++) {
      const date = shiftKey(from, i);
      const weekday = getWeekday(date);
      occurrences[weekday]++;
      const ids = (completions[date] ?? []).filter((id) => habitIds.has(id));
      if (ids.length > 0) active[weekday]++;
    }
  }

  return (Array.from({ length: 7 }, (_, weekday) => weekday) as Weekday[])
    .map((weekday) => ({
      weekday,
      activeDays: active[weekday],
      occurrences: occurrences[weekday],
      rate: occurrences[weekday] === 0 ? 0 : active[weekday] / occurrences[weekday],
    }))
    .sort((a, b) => b.rate - a.rate || b.activeDays - a.activeDays);
}

/**
 * Consistency for the first and second half of the year, so a recap can say
 * "second half stronger than first" from evidence rather than a vibe. Either
 * side is null when nothing was judged in it yet — a partial year's unstarted
 * second half is absent, not a lying 0%.
 */
export function halfYearConsistency(
  categories: Category[],
  habits: Habit[],
  completions: CompletionMap,
  year: number,
  sickDays: ReadonlySet<DateKey>,
  today: DateKey = todayKey(),
): { first: number | null; second: number | null } {
  const isDone = (habitId: string, date: DateKey) => (completions[date] ?? []).includes(habitId);
  const anchors = categoryAnchors(categories, habits, completions);

  const consistencyOver = (from: DateKey, to: DateKey): number | null => {
    const end = to > today ? today : to;
    const span = daysBetween(from, end);
    if (span < 0) return null;
    let judged = 0;
    let goal = 0;
    for (let i = 0; i <= span; i++) {
      const date = shiftKey(from, i);
      const { judged: dayJudged, met: dayMet } = judgeDate(
        categories,
        habits,
        date,
        isDone,
        sickDays.has(date),
        anchors,
      );
      if (dayJudged === 0) continue;
      judged++;
      if (dayJudged === dayMet) goal++;
    }
    return judged === 0 ? null : Math.round((goal / judged) * 100);
  };

  return {
    first: consistencyOver(`${year}-01-01`, `${year}-06-30`),
    second: consistencyOver(`${year}-07-01`, `${year}-12-31`),
  };
}

/** Mean completions on a day that had any activity — how full a typical active day was. */
export function avgCompletionsPerActiveDay(summary: YearSummary): number | null {
  if (summary.activeDays === 0) return null;
  return Math.round((summary.totalCompletions / summary.activeDays) * 10) / 10;
}

export interface GoalsByResult {
  reached: GoalProgress[];
  inProgress: GoalProgress[];
  ended: GoalProgress[];
}

/**
 * A goal's yearly conclusion, without judging it. "Reached" and "ended" are
 * both just results — the split exists so a finished year can lead with what
 * landed, not so unfinished goals read as failures.
 */
export function goalsByResult(goalProgress: GoalProgress[]): GoalsByResult {
  const reached = goalProgress
    .filter((p) => p.status === "completed")
    .sort((a, b) => (b.completedOn ?? "").localeCompare(a.completedOn ?? ""));
  const inProgress = goalProgress
    .filter((p) => p.status === "active")
    .sort((a, b) => b.percent - a.percent);
  const ended = goalProgress
    .filter((p) => p.status === "ended")
    .sort((a, b) => b.percent - a.percent);
  return { reached, inProgress, ended };
}

/** This year's notes, chronological — the raw record, no inferred importance. */
export function notesInYear(notes: NoteMap, year: number): { date: DateKey; text: string }[] {
  return Object.entries(notes)
    .filter(([date]) => date.startsWith(String(year)))
    .map(([date, text]) => ({ date, text }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface HabitStory {
  habit: Habit;
  totalCompletions: number;
  bestMonth: { month: number; count: number } | null;
  topVariant: { variant: string; count: number } | null;
}

/**
 * A short story for the habits that actually carried the year, not every
 * habit that exists. Below the threshold, a habit is a line in Statistics
 * already — repeating it here would be padding, not a story.
 */
const MIN_STORY_COMPLETIONS = 5;

export function habitStories(
  habits: Habit[],
  completions: CompletionMap,
  variants: VariantMap,
  year: number,
  limit = 4,
): HabitStory[] {
  const totals = new Map<string, number>();
  const perMonth = new Map<string, number[]>();
  const variantTally = new Map<string, Map<string, number>>();

  for (const [date, ids] of Object.entries(completions)) {
    if (!date.startsWith(String(year))) continue;
    const month = Number(date.slice(5, 7)) - 1;
    for (const id of ids) {
      totals.set(id, (totals.get(id) ?? 0) + 1);
      const months = perMonth.get(id) ?? new Array(12).fill(0);
      months[month]++;
      perMonth.set(id, months);

      const variant = variants[date]?.[id];
      if (variant) {
        const tally = variantTally.get(id) ?? new Map<string, number>();
        tally.set(variant, (tally.get(variant) ?? 0) + 1);
        variantTally.set(id, tally);
      }
    }
  }

  const stories: HabitStory[] = [];
  for (const habit of habits) {
    const totalCompletions = totals.get(habit.id) ?? 0;
    if (totalCompletions < MIN_STORY_COMPLETIONS) continue;

    const months = perMonth.get(habit.id) ?? [];
    const monthsWithData = months.filter((n) => n > 0).length;
    let bestMonth: HabitStory["bestMonth"] = null;
    if (monthsWithData >= 2) {
      let bestIndex = 0;
      for (let i = 1; i < 12; i++) if (months[i] > months[bestIndex]) bestIndex = i;
      bestMonth = { month: bestIndex, count: months[bestIndex] };
    }

    let topVariant: HabitStory["topVariant"] = null;
    const tally = variantTally.get(habit.id);
    if (tally) {
      const [variant, count] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
      topVariant = { variant, count };
    }

    stories.push({ habit, totalCompletions, bestMonth, topVariant });
  }

  return stories.sort((a, b) => b.totalCompletions - a.totalCompletions).slice(0, limit);
}

export interface OnThisDayEntry {
  year: number;
  date: DateKey;
  completedNames: string[];
  note: string | null;
  moments: Moment[];
}

/**
 * The most recent past year that has something recorded on this same
 * month/day, or null if none of the last few years do. Only one year is
 * ever returned — Today is meant to stay quiet, so this is a single quiet
 * line, not a scrollback through history.
 *
 * Feb 29 on a year that wasn't a leap year simply has no entry to find; nothing
 * special is substituted for it.
 */
export function onThisDay(
  todayDate: DateKey,
  habits: Habit[],
  completions: CompletionMap,
  notes: NoteMap,
  moments: Moment[],
  yearsBack = 5,
): OnThisDayEntry | null {
  const [y, m, d] = todayDate.split("-").map(Number);
  const habitById = new Map(habits.map((h) => [h.id, h]));

  for (let back = 1; back <= yearsBack; back++) {
    const year = y - back;
    const daysInThatMonth = new Date(year, m, 0).getDate();
    if (d > daysInThatMonth) continue; // e.g. Feb 29 on a non-leap year

    const key = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const ids = completions[key] ?? [];
    const note = notes[key] ?? null;
    const dayMoments = moments.filter((moment) => moment.date === key);
    if (ids.length === 0 && !note && dayMoments.length === 0) continue;

    const completedNames = ids
      .map((id) => habitById.get(id)?.name)
      .filter((name): name is string => Boolean(name));

    return { year, date: key, completedNames, note, moments: dayMoments };
  }

  return null;
}

export { MONTH_NAMES };
