import { test } from "node:test";
import assert from "node:assert/strict";

import type { Category, Habit } from "@/types";
import { categoryProgress, goalTargetOn, progressLabel } from "@/lib/categories";
import {
  computeCategoryStats,
  computeHabitStats,
  computeOverallStreak,
  computeYearSummary,
} from "@/lib/stats";
import { shiftKey, todayKey } from "@/lib/dates";

/**
 * Goal evaluation and the numbers derived from it. Each behaviour is paired
 * with its counterfactual so a passing test can't be an accident.
 */

const today = todayKey();
const yesterday = shiftKey(today, -1);
const twoDaysAgo = shiftKey(today, -2);

const habit = (id: string, categoryId = "c1", order = 0): Habit => ({
  id,
  categoryId,
  name: id,
  emoji: "🎯",
  color: "#3B9EF5",
  schedule: { type: "daily" },
  order,
  archived: false,
  createdAt: `${twoDaysAgo}T00:00:00.000Z`,
});

const category = (goalType: Category["goalType"], goalTarget = 1): Category => ({
  id: "c1",
  name: "Test",
  order: 0,
  goalType,
  goalTarget,
  collapsed: false,
  archived: false,
});

const three = [habit("a"), habit("b", "c1", 1), habit("c", "c1", 2)];
const doneOnly = (ids: string[]) => (habitId: string) => ids.includes(habitId);

test("'complete all' needs every due item", () => {
  const all = category("all");
  assert.equal(goalTargetOn(all, 3), 3);
  assert.ok(!categoryProgress(all, three, yesterday, doneOnly(["a", "b"])).goalMet);
  assert.ok(categoryProgress(all, three, yesterday, doneOnly(["a", "b", "c"])).goalMet);
});

test("'complete any' is satisfied by a single item", () => {
  const any = category("any");
  assert.equal(goalTargetOn(any, 3), 1);
  assert.ok(categoryProgress(any, three, yesterday, doneOnly(["b"])).goalMet);
  assert.ok(!categoryProgress(any, three, yesterday, doneOnly([])).goalMet);
  // Several activities on one day all get recorded, not collapsed to one.
  assert.equal(categoryProgress(any, three, yesterday, doneOnly(["a", "c"])).completed.length, 2);
});

test("a custom goal clamps to what is actually due", () => {
  const custom = category("custom", 2);
  assert.ok(categoryProgress(custom, three, yesterday, doneOnly(["a", "c"])).goalMet);
  assert.ok(!categoryProgress(custom, three, yesterday, doneOnly(["a"])).goalMet);
  // Asking for 5 of 3 would otherwise be permanently unreachable.
  assert.equal(goalTargetOn(category("custom", 5), 3), 3);
});

test("progress labels read naturally per goal type", () => {
  const any = category("any");
  const all = category("all");
  assert.equal(
    progressLabel(any, categoryProgress(any, three, yesterday, doneOnly(["a"]))),
    "1 activity today",
  );
  assert.equal(
    progressLabel(all, categoryProgress(all, three, yesterday, doneOnly(["a"]))),
    "1 / 3",
  );
});

// --- sick days ------------------------------------------------------------

test("a sick day excuses the goal entirely", () => {
  const all = category("all");
  const excused = categoryProgress(all, three, yesterday, doneOnly([]), true);
  assert.equal(excused.due.length, 0, "nothing is due");
  assert.ok(!excused.goalMet, "and nothing is missed either");
});

test("a sick day bridges streaks instead of breaking them", () => {
  const any = category("any");
  const active = [habit("a")];
  const completions = { [twoDaysAgo]: ["a"], [today]: ["a"] };

  assert.equal(
    computeOverallStreak([any], active, completions, new Set([yesterday])),
    2,
    "the gap is excused, so both real days count",
  );
  assert.equal(
    computeOverallStreak([any], active, completions, new Set()),
    1,
    "counterfactual: without the sick flag the same gap resets it",
  );
});

test("individual habit streaks bridge sick days too", () => {
  const completions = { [twoDaysAgo]: ["a"], [today]: ["a"] };
  assert.equal(computeHabitStats(habit("a"), completions, 1, new Set([yesterday])).currentStreak, 2);
  assert.equal(computeHabitStats(habit("a"), completions, 1, new Set()).currentStreak, 1);
});

test("something completed on a sick day still counts as done", () => {
  // The requirement is waived, not the record.
  const stats = computeHabitStats(
    habit("a"),
    { [twoDaysAgo]: ["a"], [yesterday]: ["a"], [today]: ["a"] },
    1,
    new Set([yesterday]),
  );
  assert.equal(stats.totalCompleted, 3);
});

// --- honest statistics ----------------------------------------------------

test("a fresh install reports zeroes, not invented numbers", () => {
  const any = category("any");
  const summary = computeYearSummary([any], [habit("a")], {}, Number(today.slice(0, 4)));
  assert.equal(summary.totalCompletions, 0);
  assert.equal(summary.activeDays, 0);
  assert.equal(summary.overallStreak, 0);
  assert.equal(summary.bestMonth, null, "no best month from no data");
  assert.equal(summary.hasConsistency, false, "flagged as no-data, not 0%");

  const catStats = computeCategoryStats(any, [habit("a")], {});
  assert.equal(catStats.totalCompletions, 0);
  assert.equal(catStats.topHabitName, null);
  assert.equal(catStats.hasAverage, false);
});

test("totals count exactly what is stored", () => {
  const any = category("any");
  const habits = [habit("a"), habit("b", "c1", 1)];
  const summary = computeYearSummary(
    [any],
    habits,
    { [today]: ["a", "b"], [yesterday]: ["a"] },
    Number(today.slice(0, 4)),
  );
  assert.equal(summary.totalCompletions, 3);
  assert.equal(summary.activeDays, 2);
});

test("best month needs two months before it will name one", () => {
  const all = category("all");
  const habits = [habit("a")];
  const oneMonth = computeYearSummary([all], habits, { "2026-03-04": ["a"] }, 2026);
  assert.equal(oneMonth.bestMonth, null, "one month is not a comparison");

  const twoMonths = computeYearSummary(
    [all],
    habits,
    { "2026-03-04": ["a"], "2026-03-05": ["a"], "2026-05-06": ["a"] },
    2026,
  );
  assert.equal(twoMonths.bestMonth, "March");
  assert.equal(twoMonths.bestMonthCount, 2);
});

test("rates are measured from first use, not habit creation", () => {
  // A habit created long ago but only tracked since yesterday shouldn't be
  // judged on the untracked gap.
  const old: Habit = { ...habit("a"), createdAt: "2020-01-01T00:00:00.000Z" };
  const stats = computeHabitStats(old, { [yesterday]: ["a"], [today]: ["a"] }, 1, new Set());
  assert.equal(stats.completionRate, 100);
});

// --- habit variants -------------------------------------------------------

test("variant counts tally per year, most-used first", () => {
  const gym: Habit = { ...habit("gym"), variants: ["Push", "Pull", "Legs"] };
  const year = today.slice(0, 4);
  const completions = {
    [`${year}-03-01`]: ["gym"],
    [`${year}-03-02`]: ["gym"],
    [`${year}-03-03`]: ["gym"],
    [`${year}-03-04`]: ["gym"],
  };
  const variants = {
    [`${year}-03-01`]: { gym: "Push" },
    [`${year}-03-02`]: { gym: "Push" },
    [`${year}-03-03`]: { gym: "Legs" },
    // 03-04 completed with no variant picked — must not be counted or crash.
  };

  const stats = computeHabitStats(gym, completions, 1, new Set(), undefined, variants);
  assert.deepEqual(stats.variantCounts, [
    { variant: "Push", count: 2 },
    { variant: "Legs", count: 1 },
  ]);
  assert.equal(stats.totalCompleted, 4, "an unlabelled session still counts as done");
});

test("a habit with no variants reports an empty breakdown", () => {
  const stats = computeHabitStats(habit("a"), { [today]: ["a"] }, 1);
  assert.deepEqual(stats.variantCounts, []);
});

test("longest streak is the best run this year, not just the current one", () => {
  const any = category("any");
  const habits = [habit("a")];
  // A 3-day run in March, broken, then a 1-day run in April.
  const completions = {
    "2026-03-01": ["a"],
    "2026-03-02": ["a"],
    "2026-03-03": ["a"],
    "2026-04-10": ["a"],
  };
  const summary = computeYearSummary([any], habits, completions, 2026);
  assert.equal(summary.longestStreak, 3);
});

test("a sick day extends rather than breaks the longest streak", () => {
  const any = category("any");
  const habits = [habit("a")];
  const completions = { "2026-03-01": ["a"], "2026-03-03": ["a"] };
  const withoutExcuse = computeYearSummary([any], habits, completions, 2026);
  assert.equal(withoutExcuse.longestStreak, 1, "the gap breaks it");

  const withExcuse = computeYearSummary(
    [any],
    habits,
    completions,
    2026,
    new Set(["2026-03-02"]),
  );
  assert.equal(withExcuse.longestStreak, 2, "the excused gap bridges it");
});

// --- daily judgement vs weekly items --------------------------------------

test("a times-per-week item is shown but never judged as a daily goal", () => {
  // "Train 3x a week" must not fail four times a week.
  const weekly: Habit = { ...habit("gym"), schedule: { type: "timesPerWeek", timesPerWeek: 3 } };
  const any = category("any");
  const progress = categoryProgress(any, [weekly], yesterday, () => false);

  assert.equal(progress.due.length, 1, "still actionable, still on the checklist");
  assert.equal(progress.scheduled.length, 0, "but nothing was required today");
  assert.equal(progress.judged, false, "so the day isn't judged at all");
});

test("a rest day from a weekly category doesn't break the daily streak", () => {
  // The real shape of Filip's setup: supplements every day, gym 3x a week.
  const supplements: Category = { ...category("all"), id: "sup", name: "Supplements" };
  const activity: Category = { ...category("any"), id: "act", name: "Activity" };
  const vitamin: Habit = { ...habit("vit", "sup") };
  const gym: Habit = {
    ...habit("gym", "act"),
    schedule: { type: "timesPerWeek", timesPerWeek: 3 },
  };

  // Vitamins every day; gym only two of the three days.
  const completions = {
    [twoDaysAgo]: ["vit", "gym"],
    [yesterday]: ["vit"], // rest day — no gym
    [today]: ["vit", "gym"],
  };

  assert.equal(
    computeOverallStreak([supplements, activity], [vitamin, gym], completions, new Set()),
    3,
    "the rest day is neutral, so the daily streak runs through it",
  );

  // Counterfactual: with gym as a daily habit, the rest day is a miss and
  // the streak collapses to today.
  const dailyGym: Habit = { ...habit("gym", "act") };
  assert.equal(
    computeOverallStreak([supplements, activity], [vitamin, dailyGym], completions, new Set()),
    1,
  );
});

test("a purely weekly category yields no daily streak, honestly", () => {
  // Nothing is required on any given day, so there is no daily streak to
  // report — better than inventing one.
  const weekly: Habit = { ...habit("gym"), schedule: { type: "timesPerWeek", timesPerWeek: 3 } };
  assert.equal(
    computeOverallStreak([category("any")], [weekly], { [today]: ["gym"] }, new Set()),
    0,
  );
});

test("fixed-schedule items are still judged normally", () => {
  const all = category("all");
  const daily = [habit("a"), habit("b", "c1", 1)];
  const progress = categoryProgress(all, daily, yesterday, doneOnly(["a"]));
  assert.equal(progress.judged, true);
  assert.equal(progress.target, 2);
  assert.ok(!progress.goalMet);
});

test("weekly sessions still count as real completions", () => {
  const weekly: Habit = { ...habit("gym"), schedule: { type: "timesPerWeek", timesPerWeek: 3 } };
  const stats = computeCategoryStats(
    category("any"),
    [weekly],
    { [twoDaysAgo]: ["gym"], [today]: ["gym"] },
  );
  assert.equal(stats.totalCompletions, 2, "unjudged days still hold real records");
});

test("an 'any' category counts the days you actually did something", () => {
  // Measured per week, so no day is judged — but 2 sessions is still 2 days.
  const gym: Habit = { ...habit("gym"), schedule: { type: "timesPerWeek", timesPerWeek: 3 } };
  const year = Number(today.slice(0, 4));
  const stats = computeCategoryStats(
    category("any"),
    [gym],
    { [twoDaysAgo]: ["gym"], [today]: ["gym"] },
  );
  assert.equal(stats.goalDaysThisYear, 2, "active days, not judged days");
  assert.equal(stats.judgedDays, 0, "and it reports having no daily goal");
  assert.ok(year > 0);
});

test("an 'all' category still counts only fully-met days", () => {
  const stats = computeCategoryStats(
    category("all"),
    [habit("a"), habit("b", "c1", 1)],
    { [twoDaysAgo]: ["a", "b"], [yesterday]: ["a"] },
  );
  assert.equal(stats.goalDaysThisYear, 1, "the half day doesn't count");
  assert.ok(stats.judgedDays >= 2);
});
