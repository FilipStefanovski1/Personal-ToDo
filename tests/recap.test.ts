import { test } from "node:test";
import assert from "node:assert/strict";

import type { Category, CompletionMap, DateKey, Goal, Habit, NoteMap, VariantMap } from "@/types";
import { computeGoalProgress } from "@/lib/goals";
import {
  avgCompletionsPerActiveDay,
  computeMonthlyBreakdown,
  goalsByResult,
  habitStories,
  halfYearConsistency,
  notesInYear,
  strongestMonth,
  weekdayPattern,
} from "@/lib/recap";

/**
 * The Year Review is built entirely on these reducers. They're tested apart
 * from any component: given records and a "today", each must return numbers
 * that hold up under a partial year, a leap year, and a year with nothing in
 * it yet.
 */

const habit = (id: string, categoryId = "c1", color = "#3B9EF5"): Habit => ({
  id,
  categoryId,
  name: id,
  emoji: "🎯",
  color,
  schedule: { type: "daily" },
  order: 0,
  archived: false,
  createdAt: "2020-01-01T00:00:00.000Z",
});

const category = (goalType: Category["goalType"] = "all"): Category => ({
  id: "c1",
  name: "Test",
  order: 0,
  goalType,
  goalTarget: 1,
  collapsed: false,
  archived: false,
});

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: "g1",
  name: "",
  source: { type: "habit", habitId: "gym" },
  target: 100,
  period: { type: "year", year: 2026 },
  archived: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

/** N consecutive daily completions of `id` starting at `from`. */
function run(id: string, from: DateKey, count: number): CompletionMap {
  const out: CompletionMap = {};
  const [y, m, d] = from.split("-").map(Number);
  for (let i = 0; i < count; i++) {
    const date = new Date(y, m - 1, d + i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
    out[key] = [...(out[key] ?? []), id];
  }
  return out;
}

// --- monthly breakdown ------------------------------------------------

test("months after today are zeroed and marked future", () => {
  const breakdown = computeMonthlyBreakdown(
    [category()],
    [habit("a")],
    run("a", "2026-01-01", 10),
    {},
    [],
    [],
    2026,
    new Set(),
    "2026-06-15",
  );
  assert.equal(breakdown[6].isFuture, true, "July hasn't started yet");
  assert.equal(breakdown[6].completions, 0);
  assert.equal(breakdown[6].consistency, null);
  assert.equal(breakdown[5].isFuture, false, "June is in progress, not future");
});

test("a month's consistency is goal-met days over judged days", () => {
  const completions: CompletionMap = {
    "2026-01-01": ["a"],
    "2026-01-02": ["a"],
    "2026-01-03": ["a"],
    // 4th and 5th are missed
  };
  const breakdown = computeMonthlyBreakdown(
    [category()],
    [habit("a")],
    completions,
    {},
    [],
    [],
    2026,
    new Set(),
    "2026-01-05",
  );
  // 5 judged days (Jan 1-5), 3 met.
  assert.equal(breakdown[0].judgedDays, 5);
  assert.equal(breakdown[0].goalDays, 3);
  assert.equal(breakdown[0].consistency, 60);
});

test("a category isn't judged before its first recorded completion", () => {
  // Tracking only actually started in March; January and February must read
  // as untracked, not as two months of missed goals.
  const completions: CompletionMap = run("a", "2026-03-01", 10);
  const breakdown = computeMonthlyBreakdown(
    [category()],
    [habit("a")],
    completions,
    {},
    [],
    [],
    2026,
    new Set(),
    "2026-03-31",
  );
  assert.equal(breakdown[0].judgedDays, 0, "January is before tracking began");
  assert.equal(breakdown[0].consistency, null);
  // March is judged in full from its first recorded day onward — the habit
  // is still due every day once tracking starts, it just wasn't done all 31.
  assert.equal(breakdown[2].judgedDays, 31);
  assert.equal(breakdown[2].goalDays, 10);
});

test("half-year consistency also respects when tracking actually began", () => {
  const completions: CompletionMap = run("a", "2026-08-01", 10);
  const result = halfYearConsistency(
    [category()],
    [habit("a")],
    completions,
    2026,
    new Set(),
    "2026-08-10",
  );
  assert.equal(result.first, null, "nothing was tracked in the first half");
  assert.equal(result.second, 100);
});

test("a month with no judged days reports null consistency, not zero", () => {
  const breakdown = computeMonthlyBreakdown([], [], {}, {}, [], [], 2026, new Set(), "2026-02-01");
  assert.equal(breakdown[0].consistency, null);
});

test("a leap year's February gets all 29 days without error", () => {
  const completions: CompletionMap = { "2024-02-29": ["a"] };
  const breakdown = computeMonthlyBreakdown(
    [category("any")],
    [habit("a")],
    completions,
    {},
    [],
    [],
    2024,
    new Set(),
    "2024-03-01",
  );
  assert.equal(breakdown[1].activeDays, 1, "Feb 29 counted as an active day");
});

test("notes and moments are tallied into the month they fall in", () => {
  const notes: NoteMap = { "2026-03-05": "squat PR", "2026-03-20": "rest day" };
  const breakdown = computeMonthlyBreakdown(
    [],
    [],
    {},
    notes,
    [{ id: "m1", date: "2026-03-10", title: "Shipped", emoji: "🚀" }],
    [],
    2026,
    new Set(),
    "2026-04-01",
  );
  assert.equal(breakdown[2].noteCount, 2);
  assert.equal(breakdown[2].momentCount, 1);
});

test("top habits within a month are ranked by completions, capped at three", () => {
  const completions: CompletionMap = {};
  for (let d = 1; d <= 10; d++) completions[`2026-01-${String(d).padStart(2, "0")}`] = ["a"];
  for (let d = 1; d <= 5; d++)
    completions[`2026-01-${String(d).padStart(2, "0")}`].push("b");
  const breakdown = computeMonthlyBreakdown(
    [],
    [habit("a"), habit("b")],
    completions,
    {},
    [],
    [],
    2026,
    new Set(),
    "2026-01-31",
  );
  assert.deepEqual(
    breakdown[0].topHabits.map((h) => h.habitId),
    ["a", "b"],
  );
});

// --- strongest month ----------------------------------------------------

test("strongest month needs at least two judged months to name one", () => {
  const breakdown = computeMonthlyBreakdown(
    [category()],
    [habit("a")],
    run("a", "2026-01-01", 5),
    {},
    [],
    [],
    2026,
    new Set(),
    "2026-01-05",
  );
  assert.equal(strongestMonth(breakdown), null);
});

test("strongest month picks the highest consistency, breaking ties by completions", () => {
  // January: perfect but only 3 completions. March: also perfect, 5 completions.
  const completions: CompletionMap = {
    ...run("a", "2026-01-01", 3),
    ...run("a", "2026-03-01", 5),
  };
  const breakdown = computeMonthlyBreakdown(
    [category()],
    [habit("a")],
    completions,
    {},
    [],
    [],
    2026,
    new Set(),
    "2026-03-05",
  );
  const strongest = strongestMonth(breakdown);
  assert.equal(strongest?.month, 2, "March wins the tie on volume");
  assert.equal(strongest?.consistency, 100);
});

// --- weekday pattern ------------------------------------------------

test("weekday rate is normalised by how often that weekday has occurred", () => {
  // 2026-01-01 is a Thursday. Complete every Thursday in January, nothing else.
  const completions: CompletionMap = {
    "2026-01-01": ["a"],
    "2026-01-08": ["a"],
    "2026-01-15": ["a"],
  };
  const pattern = weekdayPattern([habit("a")], completions, 2026, "2026-01-15");
  const thursday = pattern.find((p) => p.weekday === 4)!;
  assert.equal(thursday.activeDays, 3);
  assert.equal(thursday.occurrences, 3);
  assert.equal(thursday.rate, 1);
  assert.equal(pattern[0].weekday, 4, "Thursday sorts first at a perfect rate");
});

// --- half-year comparison ------------------------------------------------

test("the second half of a year not yet reached reports null, not zero", () => {
  const result = halfYearConsistency(
    [category()],
    [habit("a")],
    run("a", "2026-01-01", 30),
    2026,
    new Set(),
    "2026-04-01",
  );
  assert.notEqual(result.first, null);
  assert.equal(result.second, null);
});

// --- average completions per active day ------------------------------------

test("average completions per active day is null with no active days", () => {
  assert.equal(
    avgCompletionsPerActiveDay({
      year: 2026,
      totalCompletions: 0,
      consistency: 0,
      hasConsistency: false,
      bestMonth: null,
      bestMonthCount: 0,
      overallStreak: 0,
      longestStreak: 0,
      activeDays: 0,
    }),
    null,
  );
});

test("average completions per active day rounds to one decimal", () => {
  const value = avgCompletionsPerActiveDay({
    year: 2026,
    totalCompletions: 7,
    consistency: 0,
    hasConsistency: false,
    bestMonth: null,
    bestMonthCount: 0,
    overallStreak: 0,
    longestStreak: 0,
    activeDays: 3,
  });
  assert.equal(value, 2.3);
});

// --- goals by result ------------------------------------------------

test("goals split into reached, in progress, and ended", () => {
  const reached = computeGoalProgress(
    goal({ id: "g1", target: 3 }),
    run("gym", "2026-01-01", 5),
    [habit("gym")],
    "2026-12-01",
  );
  const inProgress = computeGoalProgress(
    goal({ id: "g2", target: 100, source: { type: "habit", habitId: "read" } }),
    run("read", "2026-01-01", 10),
    [habit("read")],
    "2026-06-01",
  );
  const ended = computeGoalProgress(
    goal({
      id: "g3",
      target: 100,
      source: { type: "habit", habitId: "run" },
      period: { type: "custom", from: "2026-01-01", to: "2026-03-01" },
    }),
    run("run", "2026-01-01", 10),
    [habit("run")],
    "2026-12-01",
  );

  const split = goalsByResult([reached, inProgress, ended]);
  assert.equal(split.reached.length, 1);
  assert.equal(split.reached[0].goal.id, "g1");
  assert.equal(split.inProgress.length, 1);
  assert.equal(split.inProgress[0].goal.id, "g2");
  assert.equal(split.ended.length, 1);
  assert.equal(split.ended[0].goal.id, "g3");
});

// --- notes ------------------------------------------------

test("notes are scoped to the year and sorted chronologically", () => {
  const notes: NoteMap = {
    "2025-12-31": "last year",
    "2026-03-01": "March",
    "2026-01-15": "January",
  };
  const result = notesInYear(notes, 2026);
  assert.deepEqual(
    result.map((n) => n.date),
    ["2026-01-15", "2026-03-01"],
  );
});

// --- habit stories ------------------------------------------------

test("a habit below the story threshold is left out", () => {
  const stories = habitStories(
    [habit("a")],
    run("a", "2026-01-01", 3),
    {},
    2026,
  );
  assert.equal(stories.length, 0);
});

test("a habit's best month needs two months of data, and picks the peak", () => {
  const completions: CompletionMap = {
    ...run("a", "2026-01-01", 6),
    ...run("a", "2026-07-01", 10),
  };
  const [story] = habitStories([habit("a")], completions, {}, 2026);
  assert.equal(story.totalCompletions, 16);
  assert.equal(story.bestMonth?.month, 6, "July, 0-indexed");
  assert.equal(story.bestMonth?.count, 10);
});

test("a habit's top variant is the most-logged one", () => {
  const completions = run("gym", "2026-01-01", 6);
  const variants: VariantMap = {
    "2026-01-01": { gym: "Push" },
    "2026-01-02": { gym: "Push" },
    "2026-01-03": { gym: "Pull" },
  };
  const [story] = habitStories([habit("gym")], completions, variants, 2026);
  assert.equal(story.topVariant?.variant, "Push");
  assert.equal(story.topVariant?.count, 2);
});

test("stories rank by total completions and respect the limit", () => {
  // Non-overlapping date ranges: each run() starts from a bare object, so
  // spreading three that share dates would let the last one clobber the rest.
  const completions: CompletionMap = {
    ...run("a", "2026-01-01", 20),
    ...run("b", "2026-03-01", 10),
    ...run("c", "2026-05-01", 6),
  };
  const stories = habitStories(
    [habit("a"), habit("b"), habit("c")],
    completions,
    {},
    2026,
    2,
  );
  assert.deepEqual(stories.map((s) => s.habit.id), ["a", "b"]);
});
