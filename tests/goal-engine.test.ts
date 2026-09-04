import { test } from "node:test";
import assert from "node:assert/strict";

import type { Category, CompletionMap, Goal, Habit } from "@/types";
import {
  computeGoalProgress,
  goalLabel,
  goalSourceExists,
  nudgeLabel,
  paceLabel,
  periodRange,
  sortGoalsForDisplay,
} from "@/lib/goals";
import { normalizeGoals, normalizeMoments } from "@/lib/normalize";

/**
 * Goals derive everything from the completion history. These guard the two
 * properties that matter most: the numbers are honest, and nothing a goal does
 * can disturb the records underneath it.
 */

const habit = (id: string, categoryId = "c1"): Habit => ({
  id,
  categoryId,
  name: id,
  emoji: "🎯",
  color: "#3B9EF5",
  schedule: { type: "daily" },
  order: 0,
  archived: false,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const category = (id = "c1"): Category => ({
  id,
  name: "Activity",
  order: 0,
  goalType: "any",
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

/** N completions of `id` on consecutive days starting at `from`. */
function run(id: string, from: DateKey_, count: number): CompletionMap {
  const out: CompletionMap = {};
  const [y, m, d] = from.split("-").map(Number);
  for (let i = 0; i < count; i++) {
    const date = new Date(y, m - 1, d + i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
    out[key] = [id];
  }
  return out;
}
type DateKey_ = string;

// --- period boundaries ----------------------------------------------------

test("a year period spans exactly Jan 1 to Dec 31", () => {
  assert.deepEqual(periodRange({ type: "year", year: 2026 }), {
    from: "2026-01-01",
    to: "2026-12-31",
  });
});

test("a reversed custom range is tolerated, not silently empty", () => {
  assert.deepEqual(periodRange({ type: "custom", from: "2026-06-01", to: "2026-03-01" }), {
    from: "2026-03-01",
    to: "2026-06-01",
  });
});

test("completions outside the period are never counted", () => {
  const completions: CompletionMap = {
    "2025-12-31": ["gym"], // the day before
    "2026-01-01": ["gym"], // first day, counts
    "2026-12-31": ["gym"], // last day, counts
    "2027-01-01": ["gym"], // the day after
  };
  const progress = computeGoalProgress(goal(), completions, [habit("gym")], "2027-06-01");
  assert.equal(progress.current, 2, "only the two days inside 2026");
});

test("a leap day inside the period counts and lengthens the year", () => {
  const leap = goal({ period: { type: "year", year: 2028 } });
  const progress = computeGoalProgress(
    leap,
    { "2028-02-29": ["gym"] },
    [habit("gym")],
    "2028-03-01",
  );
  assert.equal(progress.current, 1);
  assert.equal(progress.daysTotal, 366);
});

test("a common year is 365 days", () => {
  const progress = computeGoalProgress(goal(), {}, [habit("gym")], "2026-06-01");
  assert.equal(progress.daysTotal, 365);
});

test("the future is never counted, even inside the period", () => {
  const completions: CompletionMap = {
    "2026-01-01": ["gym"],
    "2026-12-25": ["gym"], // recorded, but after 'today'
  };
  const progress = computeGoalProgress(goal(), completions, [habit("gym")], "2026-06-01");
  assert.equal(progress.current, 1, "only what has happened by today");
});

// --- pace ------------------------------------------------------------------

test("pace is measured against the period, not against today's date alone", () => {
  // Half the year gone, 40 of 100 done → 10 behind a steady pace.
  const progress = computeGoalProgress(
    goal({ target: 100 }),
    run("gym", "2026-01-01", 40),
    [habit("gym")],
    "2026-07-01", // day 182 of 365
  );
  assert.equal(progress.current, 40);
  assert.equal(progress.expected, 50);
  assert.equal(progress.paceDelta, -10);
  assert.equal(paceLabel(progress), "10 behind pace");
});

test("being ahead reads as ahead", () => {
  const progress = computeGoalProgress(
    goal({ target: 100 }),
    run("gym", "2026-01-01", 60),
    [habit("gym")],
    "2026-07-01",
  );
  assert.equal(progress.paceDelta, 10);
  assert.equal(paceLabel(progress), "10 ahead of pace");
});

test("an ongoing goal has no pace, rather than a pace of zero", () => {
  const ongoing = goal({ period: { type: "ongoing", from: "2026-01-01" } });
  const progress = computeGoalProgress(ongoing, run("gym", "2026-01-01", 5), [habit("gym")], "2026-03-01");
  assert.equal(progress.current, 5);
  assert.equal(progress.to, null);
  assert.equal(progress.expected, null, "pace is meaningless without an end");
  assert.equal(progress.paceDelta, null);
  assert.equal(paceLabel(progress), null);
  assert.equal(progress.daysRemaining, null);
});

test("a period that hasn't started yet reports no pace and no elapsed days", () => {
  const next = goal({ period: { type: "year", year: 2027 } });
  const progress = computeGoalProgress(next, {}, [habit("gym")], "2026-06-01");
  assert.equal(progress.daysElapsed, 0);
  assert.equal(progress.expected, null, "not 0 — the goal simply hasn't begun");
});

test("the nudge only appears when it's genuinely within reach", () => {
  const nearly = computeGoalProgress(
    goal({ target: 365 }), // one a day
    run("gym", "2026-01-01", 9),
    [habit("gym")],
    "2026-01-10", // expected 10, have 9
  );
  assert.equal(nudgeLabel(nearly), "One more puts you back on pace");

  const hopeless = computeGoalProgress(
    goal({ target: 365 }),
    run("gym", "2026-01-01", 10),
    [habit("gym")],
    "2026-03-01", // expected ~59, have 10
  );
  assert.equal(nudgeLabel(hopeless), null, "no nagging when it can't be fixed today");
});

// --- milestones ------------------------------------------------------------

test("milestones record the day each threshold was first crossed", () => {
  const progress = computeGoalProgress(
    goal({ target: 4 }), // thresholds at 1, 2, 3, 4
    run("gym", "2026-03-01", 4),
    [habit("gym")],
    "2026-06-01",
  );
  assert.deepEqual(
    progress.milestones.map((m) => [m.value, m.date]),
    [
      [1, "2026-03-01"],
      [2, "2026-03-02"],
      [3, "2026-03-03"],
      [4, "2026-03-04"],
    ],
  );
  assert.ok(progress.milestones.at(-1)!.isTarget);
});

test("milestone dates follow the records when history is corrected", () => {
  // Remove an early day and the 100th session lands a day later.
  const full = run("gym", "2026-01-01", 100);
  const withGap = { ...full };
  delete withGap["2026-01-05"];

  const before = computeGoalProgress(goal({ target: 100 }), full, [habit("gym")], "2026-12-01");
  const after = computeGoalProgress(goal({ target: 100 }), withGap, [habit("gym")], "2026-12-01");

  assert.equal(before.completedOn, "2026-04-10");
  assert.equal(after.completedOn, null, "99 sessions is not 100");
  assert.equal(after.current, 99);
});

// --- status ----------------------------------------------------------------

test("reaching the target completes the goal and records the day", () => {
  const progress = computeGoalProgress(
    goal({ target: 3 }),
    run("gym", "2026-02-01", 5),
    [habit("gym")],
    "2026-06-01",
  );
  assert.equal(progress.status, "completed");
  assert.equal(progress.completedOn, "2026-02-03", "the day the third one landed");
  assert.equal(progress.current, 5, "and it keeps counting past the target");
  assert.equal(progress.percent, 100, "percent is clamped");
});

test("an unfinished goal whose period is over is 'ended', not erased", () => {
  const progress = computeGoalProgress(
    goal({ target: 150 }),
    run("gym", "2026-01-01", 132),
    [habit("gym")],
    "2027-01-01",
  );
  assert.equal(progress.status, "ended");
  assert.equal(progress.current, 132, "the result stays on the record");
  assert.equal(progress.percent, 88);
  assert.equal(paceLabel(progress), "Finished at 88%");
});

test("a goal completed inside a period that later ends stays completed", () => {
  const progress = computeGoalProgress(
    goal({ target: 10 }),
    run("gym", "2026-01-01", 10),
    [habit("gym")],
    "2027-05-01",
  );
  assert.equal(progress.status, "completed");
});

// --- sources ---------------------------------------------------------------

test("a category goal counts active days, not total completions", () => {
  // Three supplements on one day is one active day, not three.
  const completions: CompletionMap = {
    "2026-03-01": ["a", "b", "c"],
    "2026-03-02": ["a"],
  };
  const habits = [habit("a"), habit("b"), habit("c")];
  const progress = computeGoalProgress(
    goal({ source: { type: "category", categoryId: "c1" }, target: 10 }),
    completions,
    habits,
    "2026-06-01",
  );
  assert.equal(progress.current, 2);
});

test("a goal survives its source being deleted, and says so", () => {
  const orphan = goal({ source: { type: "habit", habitId: "gone" } });
  assert.equal(goalSourceExists(orphan, [habit("gym")], [category()]), false);
  // It still computes rather than throwing.
  const progress = computeGoalProgress(orphan, run("gym", "2026-01-01", 5), [habit("gym")], "2026-06-01");
  assert.equal(progress.current, 0);
});

test("editing the target re-derives progress without touching history", () => {
  const completions = run("gym", "2026-01-01", 60);
  const before = computeGoalProgress(goal({ target: 150 }), completions, [habit("gym")], "2026-07-01");
  const after = computeGoalProgress(goal({ target: 175 }), completions, [habit("gym")], "2026-07-01");

  assert.equal(before.current, after.current, "the count is the same 60 either way");
  assert.ok(after.percent < before.percent, "only the share of the target moves");
  assert.equal(Object.keys(completions).length, 60, "and the records are untouched");
});

// --- labels and ordering ---------------------------------------------------

test("a goal falls back to a readable derived name", () => {
  const habits = [{ ...habit("gym"), name: "Gym" }];
  assert.equal(goalLabel(goal({ target: 150 }), habits, [category()]), "Gym 150 times");
  assert.equal(
    goalLabel(goal({ name: "Get strong", target: 150 }), habits, [category()]),
    "Get strong",
    "a typed name always wins",
  );
  assert.equal(
    goalLabel(
      goal({ source: { type: "category", categoryId: "c1" }, target: 200 }),
      habits,
      [category()],
    ),
    "Activity 200 days",
    "categories are measured in days",
  );
});

test("active goals sort before completed, completed before ended", () => {
  const mk = (status: "active" | "completed" | "ended", percent: number) =>
    ({ status, percent }) as never;
  const sorted = sortGoalsForDisplay([
    mk("ended", 90),
    mk("completed", 100),
    mk("active", 30),
  ]);
  assert.deepEqual(
    sorted.map((s) => (s as unknown as { status: string }).status),
    ["active", "completed", "ended"],
  );
});

// --- normalisation ---------------------------------------------------------

test("goals with an unusable source are dropped, the rest survive", () => {
  const goals = normalizeGoals([
    { id: "ok", source: { type: "habit", habitId: "gym" }, target: 150, period: { type: "year", year: 2026 } },
    { id: "bad", source: { type: "nonsense" }, target: 10 },
    null,
    "nope",
  ]);
  assert.equal(goals.length, 1);
  assert.equal(goals[0].id, "ok");
  assert.equal(goals[0].target, 150);
});

test("a nonsense target is clamped rather than stored", () => {
  const [g] = normalizeGoals([
    { source: { type: "habit", habitId: "gym" }, target: -5, period: { type: "year", year: 2026 } },
  ]);
  assert.equal(g.target, 1);
});

test("an invalid period falls back to the current year rather than breaking", () => {
  const [g] = normalizeGoals([
    { source: { type: "habit", habitId: "gym" }, target: 10, period: { type: "custom", from: "nope", to: "also-nope" } },
  ]);
  assert.equal(g.period.type, "year");
});

test("moments need a real date and a title", () => {
  const moments = normalizeMoments([
    { date: "2026-05-01", title: "  Shipped v1  ", emoji: "🚀" },
    { date: "bad-date", title: "Dropped" },
    { date: "2026-05-02", title: "   " },
  ]);
  assert.equal(moments.length, 1);
  assert.equal(moments[0].title, "Shipped v1");
  assert.equal(moments[0].emoji, "🚀");
});
