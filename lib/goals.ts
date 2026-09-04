import type {
  Category,
  CompletionMap,
  DateKey,
  Goal,
  GoalMilestone,
  GoalPeriod,
  GoalProgress,
  GoalSource,
  GoalStatus,
  Habit,
  Moment,
} from "@/types";
import { daysBetween, shiftKey, todayKey } from "./dates";

/**
 * Goals read the completion history; they never write to it. Every number
 * below is recomputed from records on each render, so editing a goal's target,
 * archiving it, or deleting it outright can't corrupt a single completion —
 * and un-checking a day in the past correctly rewinds the goal that counted it.
 *
 * Milestones are derived for the same reason. Storing "reached 100 on Sep 18"
 * would go stale the moment you corrected an earlier day; walking the dates in
 * order costs nothing and is always right.
 */

/** Milestone thresholds, as fractions of the target. */
const MILESTONE_FRACTIONS = [0.25, 0.5, 0.75, 1];

/** The concrete date range a period covers. `to` is null for ongoing goals. */
export function periodRange(period: GoalPeriod): { from: DateKey; to: DateKey | null } {
  switch (period.type) {
    case "year":
      return { from: `${period.year}-01-01`, to: `${period.year}-12-31` };
    case "custom":
      // Tolerate a reversed range rather than silently counting nothing.
      return period.from <= period.to
        ? { from: period.from, to: period.to }
        : { from: period.to, to: period.from };
    case "ongoing":
      return { from: period.from, to: null };
  }
}

/**
 * The dates a goal counts on, in order, up to today.
 *
 * String comparison is safe and exact for `YYYY-MM-DD` keys, which avoids
 * constructing Dates per day and sidesteps every DST and UTC trap.
 */
function countableDates(
  completions: CompletionMap,
  from: DateKey,
  to: DateKey | null,
  today: DateKey,
): DateKey[] {
  // Never count the future, even if a period extends into it.
  const end = to === null || to > today ? today : to;
  if (from > end) return [];

  return Object.keys(completions)
    .filter((date) => date >= from && date <= end)
    .sort();
}

/** Whether a single day counts toward this goal. */
function dayCounts(
  source: GoalSource,
  ids: string[],
  habitsByCategory: Map<string, Set<string>>,
): boolean {
  if (source.type === "habit") return ids.includes(source.habitId);
  const members = habitsByCategory.get(source.categoryId);
  if (!members) return false;
  // A category goal counts *active days*, not total completions: doing three
  // supplements on one day is one day of Supplements, not three.
  return ids.some((id) => members.has(id));
}

/** True when the goal's source still exists. */
export function goalSourceExists(goal: Goal, habits: Habit[], categories: Category[]): boolean {
  const { source } = goal;
  return source.type === "habit"
    ? habits.some((h) => h.id === source.habitId)
    : categories.some((c) => c.id === source.categoryId);
}

/**
 * Everything the UI needs about one goal, derived fresh from the records.
 *
 * Progress deliberately counts the *whole period*, not just the days since the
 * goal was created. Setting "Gym 150 in 2026" in September should immediately
 * show the sessions you already did in January — the app already knows them,
 * and asking you to backfill would be the exact busywork this avoids.
 */
export function computeGoalProgress(
  goal: Goal,
  completions: CompletionMap,
  habits: Habit[],
  today: DateKey = todayKey(),
): GoalProgress {
  const { from, to } = periodRange(goal.period);
  const target = Math.max(1, Math.round(goal.target));

  const habitsByCategory = new Map<string, Set<string>>();
  for (const habit of habits) {
    const set = habitsByCategory.get(habit.categoryId) ?? new Set<string>();
    set.add(habit.id);
    habitsByCategory.set(habit.categoryId, set);
  }

  // Walk in date order so the Nth hit carries the day it happened.
  const milestoneValues = MILESTONE_FRACTIONS.map((f) => Math.max(1, Math.round(target * f)))
    .filter((v, i, all) => all.indexOf(v) === i);

  const milestones: GoalMilestone[] = [];
  let current = 0;
  let completedOn: DateKey | null = null;

  for (const date of countableDates(completions, from, to, today)) {
    if (!dayCounts(goal.source, completions[date] ?? [], habitsByCategory)) continue;
    current++;
    for (const value of milestoneValues) {
      if (current === value) {
        milestones.push({ value, date, isTarget: value === target });
      }
    }
    if (current === target) completedOn = date;
  }

  const started = today >= from;
  const daysElapsed = started ? daysBetween(from, today) + 1 : 0;

  let daysTotal: number | null = null;
  let daysRemaining: number | null = null;
  let expected: number | null = null;

  if (to !== null) {
    daysTotal = daysBetween(from, to) + 1;
    daysRemaining = Math.max(0, daysBetween(today, to));
    if (started && daysTotal > 0) {
      // Where a steady pace puts you by end of today.
      const elapsed = Math.min(daysElapsed, daysTotal);
      expected = Math.round((target * elapsed) / daysTotal);
    }
  }

  const periodOver = to !== null && today > to;
  const status: GoalStatus =
    completedOn !== null ? "completed" : periodOver ? "ended" : "active";

  return {
    goal,
    status,
    current,
    target,
    percent: Math.min(100, Math.round((current / target) * 100)),
    from,
    to,
    daysElapsed,
    daysTotal,
    daysRemaining,
    expected,
    paceDelta: expected === null ? null : current - expected,
    completedOn,
    milestones,
  };
}

/** "Gym", "Activity" — the thing being counted. */
export function goalSourceName(
  source: GoalSource,
  habits: Habit[],
  categories: Category[],
): string {
  if (source.type === "habit") {
    return habits.find((h) => h.id === source.habitId)?.name ?? "Deleted item";
  }
  return categories.find((c) => c.id === source.categoryId)?.name ?? "Deleted category";
}

/** The colour a goal borrows from its source, for its progress bar. */
export function goalColor(
  source: GoalSource,
  habits: Habit[],
  fallback: string,
): string {
  if (source.type === "habit") {
    return habits.find((h) => h.id === source.habitId)?.color ?? fallback;
  }
  // A category has no colour of its own; borrow its first item's.
  const first = habits.find((h) => h.categoryId === source.categoryId);
  return first?.color ?? fallback;
}

/** "2026", "until 12 Mar", "since 3 Sep" — a period in a few words. */
export function describePeriod(period: GoalPeriod): string {
  switch (period.type) {
    case "year":
      return String(period.year);
    case "custom":
      return "Custom range";
    case "ongoing":
      return "Ongoing";
  }
}

/**
 * The name shown for a goal. A typed name always wins; otherwise it reads as
 * the thing plus the target, which is what most goals would be called anyway.
 */
export function goalLabel(
  goal: Goal,
  habits: Habit[],
  categories: Category[],
): string {
  const typed = goal.name.trim();
  if (typed) return typed;
  const unit = countNoun(goal.source, goal.target);
  return `${goalSourceName(goal.source, habits, categories)} ${goal.target} ${unit}`;
}

/**
 * How the goal is doing, in the app's voice — plain, never scolding.
 * Returns null when pace doesn't apply (ongoing goals, or before the start).
 */
export function paceLabel(progress: GoalProgress): string | null {
  if (progress.status === "completed") return "Reached";
  if (progress.paceDelta === null) return null;
  if (progress.status === "ended") return `Finished at ${progress.percent}%`;

  const delta = progress.paceDelta;
  if (delta === 0) return "Exactly on pace";
  if (delta > 0) return `${delta} ahead of pace`;
  return `${Math.abs(delta)} behind pace`;
}

/**
 * The smallest useful nudge: what one more would do for you today. Only
 * offered when it's genuinely within reach, so it reads as encouragement
 * rather than a demand.
 */
export function nudgeLabel(progress: GoalProgress): string | null {
  if (progress.status !== "active" || progress.paceDelta === null) return null;
  const behind = -progress.paceDelta;
  if (behind <= 0) return null;
  if (behind === 1) return "One more puts you back on pace";
  if (behind <= 3) return `${behind} more puts you back on pace`;
  return null;
}

/** Active goals first, then completed, then ended; each by closeness to done. */
export function sortGoalsForDisplay(entries: GoalProgress[]): GoalProgress[] {
  const rank: Record<GoalStatus, number> = { active: 0, completed: 1, ended: 2 };
  return [...entries].sort((a, b) => {
    const byStatus = rank[a.status] - rank[b.status];
    if (byStatus !== 0) return byStatus;
    return b.percent - a.percent;
  });
}

/**
 * One line in the year's story — a milestone crossed or a moment marked.
 *
 * Goal milestones and hand-marked moments are merged deliberately. "Reached
 * 75 gym sessions · Jul 24" and "Shipped Aminta v1 · Mar 3" are the same kind
 * of thing when you're looking back at a year: things that happened, on days.
 * Keeping them in separate lists would make the achievements feel like
 * analytics rather than part of the record.
 */
export interface YearHighlight {
  key: string;
  date: DateKey;
  kind: "milestone" | "moment";
  title: string;
  /** Emoji for moments; milestones carry a colour dot instead. */
  emoji?: string;
  color?: string;
}

export function collectYearHighlights(
  year: number,
  goalProgress: GoalProgress[],
  moments: Moment[],
  habits: Habit[],
  categories: Category[],
  fallbackColor: string,
): YearHighlight[] {
  const prefix = String(year);
  const out: YearHighlight[] = [];

  for (const progress of goalProgress) {
    const name = goalSourceName(progress.goal.source, habits, categories);
    const color = goalColor(progress.goal.source, habits, fallbackColor);

    for (const milestone of progress.milestones) {
      if (!milestone.date.startsWith(prefix)) continue;
      // The final one is the goal itself landing, which deserves its own words.
      out.push({
        key: `${progress.goal.id}:${milestone.value}`,
        date: milestone.date,
        kind: "milestone",
        // Name first: the list is scanned down the left edge, and "Gym — 75
        // times" reads as a thing that happened where "75 times of Gym" reads
        // as a database row.
        title: milestone.isTarget
          ? `${name} goal reached — ${milestone.value} ${countNoun(progress.goal.source, milestone.value)}`
          : `${name} — ${milestone.value} ${countNoun(progress.goal.source, milestone.value)}`,
        color,
      });
    }
  }

  for (const moment of moments) {
    if (!moment.date.startsWith(prefix)) continue;
    out.push({
      key: moment.id,
      date: moment.date,
      kind: "moment",
      title: moment.title,
      emoji: moment.emoji,
    });
  }

  // Newest first: mid-year the recent entries are the ones you're looking for.
  return out.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

/**
 * The unit a source is counted in. Habits count completions ("times"); a
 * category counts days it had any activity ("days"). Singular when the count
 * is one, so a recap never reads "+1 times".
 */
export function countNoun(source: GoalSource, count: number): string {
  const plural = source.type === "category" ? "days" : "times";
  if (count !== 1) return plural;
  return source.type === "category" ? "day" : "time";
}

/** What a goal gained during one month, for the month's recap. */
export interface GoalMonthDelta {
  goalId: string;
  name: string;
  color: string;
  gained: number;
  noun: string;
}

/**
 * How much each goal moved during a given month.
 *
 * Month already answers "what happened"; this makes goals part of that answer
 * without repeating the Goals screen — you see the month's contribution, not
 * the running total.
 */
export function goalDeltasForMonth(
  goals: Goal[],
  completions: CompletionMap,
  habits: Habit[],
  categories: Category[],
  year: number,
  month: number,
  fallbackColor: string,
): GoalMonthDelta[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  const habitsByCategory = new Map<string, Set<string>>();
  for (const habit of habits) {
    const set = habitsByCategory.get(habit.categoryId) ?? new Set<string>();
    set.add(habit.id);
    habitsByCategory.set(habit.categoryId, set);
  }

  const out: GoalMonthDelta[] = [];
  for (const goal of goals) {
    const { from, to } = periodRange(goal.period);
    let gained = 0;
    for (const [date, ids] of Object.entries(completions)) {
      if (!date.startsWith(prefix)) continue;
      // Only days that also fall inside the goal's own period count.
      if (date < from || (to !== null && date > to)) continue;
      if (dayCounts(goal.source, ids, habitsByCategory)) gained++;
    }
    if (gained === 0) continue;
    out.push({
      goalId: goal.id,
      name: goalSourceName(goal.source, habits, categories),
      color: goalColor(goal.source, habits, fallbackColor),
      gained,
      noun: countNoun(goal.source, gained),
    });
  }
  return out.sort((a, b) => b.gained - a.gained);
}
