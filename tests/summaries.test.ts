import { test } from "node:test";
import assert from "node:assert/strict";

import type { Category, Habit } from "@/types";
import { computeMonthSummary, computeWeekSummary, computeYearRecords } from "@/lib/stats";
import { shiftKey, startOfWeek, todayKey } from "@/lib/dates";

/**
 * Week and month roll-ups. The subtle part is fairness: a period still in
 * progress must never be compared against a finished one, and today must not
 * be judged before it's over.
 */

const today = todayKey();

const habit = (id: string, categoryId = "c1", order = 0): Habit => ({
  id,
  categoryId,
  name: id,
  emoji: "🎯",
  color: "#3B9EF5",
  schedule: { type: "daily" },
  order,
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

test("the week runs from the configured first day and covers seven days", () => {
  const monday = computeWeekSummary([category()], [habit("a")], {}, new Set(), 1);
  assert.equal(monday.days.length, 7);
  assert.equal(monday.days[0].date, startOfWeek(today, 1));

  const sunday = computeWeekSummary([category()], [habit("a")], {}, new Set(), 0);
  assert.equal(sunday.days[0].date, startOfWeek(today, 0));
});

test("today is shown but never counted as a missed day", () => {
  // Nothing completed at all, including today.
  const week = computeWeekSummary([category()], [habit("a")], {}, new Set(), 1);
  const todayCell = week.days.find((d) => d.isToday)!;
  assert.ok(todayCell, "today appears in the strip");
  assert.ok(
    !week.days.filter((d) => d.isToday).some(() => week.daysJudged > 6),
    "today is excluded from the judged count",
  );
});

test("future days in the week are marked and never judged", () => {
  const week = computeWeekSummary([category()], [habit("a")], {}, new Set(), 1);
  for (const day of week.days.filter((d) => d.isFuture)) {
    assert.equal(day.judged, 0, `${day.date} is not judged`);
    assert.equal(day.met, 0);
  }
});

test("a fully met day counts as on track", () => {
  const start = startOfWeek(today, 1);
  // Use a past day in this week so it's actually judged.
  const past = start === today ? null : start;
  if (!past) return; // today is Monday; nothing finished yet this week

  const week = computeWeekSummary(
    [category()],
    [habit("a")],
    { [past]: ["a"] },
    new Set(),
    1,
  );
  assert.ok(week.daysOnTrack >= 1);
  const cell = week.days.find((d) => d.date === past)!;
  assert.equal(cell.met, cell.judged);
});

test("month summary counts only elapsed days of a month in progress", () => {
  const [year, month] = [Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1];
  const summary = computeMonthSummary(
    [category()],
    [habit("a")],
    { [today]: ["a"] },
    {},
    new Set(),
    year,
    month,
  );
  assert.equal(summary.daysElapsed, Number(today.slice(8, 10)));
  assert.equal(summary.activeDays, 1);
  assert.equal(summary.totalCompletions, 1);
  assert.equal(summary.topHabitName, "a");
});

test("a finished month is measured over its whole length", () => {
  const summary = computeMonthSummary(
    [category()],
    [habit("a")],
    { "2026-01-05": ["a"], "2026-01-06": ["a"] },
    { "2026-01-05": "note" },
    new Set(),
    2026,
    0,
  );
  assert.equal(summary.daysElapsed, 31);
  assert.equal(summary.activeDays, 2);
  assert.equal(summary.totalCompletions, 2);
  assert.equal(summary.noteCount, 1);
});

test("a finished month is compared against the whole previous month", () => {
  const completions = {
    "2026-01-02": ["a"],
    "2026-01-03": ["a"],
    "2026-01-30": ["a"], // late in January — must still count as "last month"
    "2026-02-01": ["a"],
    "2026-02-02": ["a"],
  };
  const summary = computeMonthSummary(
    [category()],
    [habit("a")],
    completions,
    {},
    new Set(),
    2026,
    1,
  );
  assert.equal(summary.totalCompletions, 2);
  assert.equal(summary.completionsDelta, -1, "2 in Feb vs all 3 in January");
});

test("a month in progress is compared against the same window last month", () => {
  // Only the elapsed part of this month counts, against the same many days
  // of last month — otherwise a half-finished month always looks like a slump.
  const [year, month] = [Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1];
  const dayOfMonth = Number(today.slice(8, 10));
  const lastMonth = new Date(year, month - 1, 1);
  const lastPrefix = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthLength = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).getDate();

  const completions: Record<string, string[]> = { [today]: ["a"] };
  // One completion inside the window, one after it.
  completions[`${lastPrefix}-01`] = ["a"];
  if (dayOfMonth < lastMonthLength) {
    completions[`${lastPrefix}-${String(lastMonthLength).padStart(2, "0")}`] = ["a"];
  }

  const summary = computeMonthSummary(
    [category()],
    [habit("a")],
    completions,
    {},
    new Set(),
    year,
    month,
  );
  assert.equal(summary.totalCompletions, 1);
  // 1 this month vs 1 in the same window last month (the late one is outside).
  if (dayOfMonth < lastMonthLength) {
    assert.equal(summary.completionsDelta, 0, "the later day is outside the window");
  }
});

test("the first tracked month reports no comparison rather than a fake one", () => {
  const summary = computeMonthSummary(
    [category()],
    [habit("a")],
    { "2026-03-02": ["a"] },
    {},
    new Set(),
    2026,
    2,
  );
  assert.equal(summary.completionsDelta, null);
});

test("completions of deleted habits are ignored by both roll-ups", () => {
  const completions = { "2026-01-05": ["ghost", "a"] };
  const month = computeMonthSummary(
    [category()],
    [habit("a")],
    completions,
    {},
    new Set(),
    2026,
    0,
  );
  assert.equal(month.totalCompletions, 1, "only the habit that still exists");
});

// --- personal records ------------------------------------------------------

test("a habit's best month is the month it actually peaked", () => {
  const completions: Record<string, string[]> = {};
  // 3 in January, 6 in March.
  for (let d = 1; d <= 3; d++) completions[`2026-01-0${d}`] = ["a"];
  for (let d = 1; d <= 6; d++) completions[`2026-03-0${d}`] = ["a"];

  const { habitBests } = computeYearRecords(
    [{ ...habit("a"), name: "Gym" }],
    completions,
    2026,
    1,
  );
  assert.equal(habitBests.length, 1);
  assert.equal(habitBests[0].detail, "6 in March");
});

test("a habit with barely any data reports no record", () => {
  // Two completions is not a personal best worth announcing.
  const { habitBests } = computeYearRecords(
    [habit("a")],
    { "2026-01-01": ["a"], "2026-01-02": ["a"] },
    2026,
    1,
  );
  assert.equal(habitBests.length, 0);
});

test("records ignore other years and deleted habits", () => {
  const completions = {
    "2025-03-01": ["a"], "2025-03-02": ["a"], "2025-03-03": ["a"],
    "2026-04-01": ["ghost"], "2026-04-02": ["ghost"], "2026-04-03": ["ghost"],
  };
  const { habitBests, busiestWeek } = computeYearRecords([habit("a")], completions, 2026, 1);
  assert.equal(habitBests.length, 0, "2025 is a different year; ghost no longer exists");
  assert.equal(busiestWeek, null);
});

test("the busiest week is found by week, not by calendar month", () => {
  const completions: Record<string, string[]> = {
    // Week of Mon 2026-03-02: four days, two habits each.
    "2026-03-02": ["a", "b"],
    "2026-03-03": ["a", "b"],
    "2026-03-04": ["a", "b"],
    "2026-03-05": ["a", "b"],
    // A quieter week.
    "2026-03-09": ["a"],
  };
  const { busiestWeek } = computeYearRecords([habit("a"), habit("b")], completions, 2026, 1);
  assert.equal(busiestWeek?.count, 8);
  assert.equal(busiestWeek?.startDate, "2026-03-02");
});
