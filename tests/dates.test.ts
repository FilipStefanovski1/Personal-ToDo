import { test } from "node:test";
import assert from "node:assert/strict";

import {
  daysBetween,
  daysInYear,
  fromDateKey,
  isValidDateKey,
  startOfWeek,
  toDateKey,
  weekdayOrder,
} from "@/lib/dates";

/**
 * Date handling is the most dangerous code in the app: every completion is
 * filed under a local calendar date, and an off-by-one here silently files
 * history on the wrong day. These run under several timezones in CI-by-hand
 * (see `npm run test:tz`).
 */

test("toDateKey reads local calendar fields, not UTC", () => {
  // Late evening local — `toISOString().slice(0,10)` would roll to tomorrow
  // anywhere west of UTC. This is the bug the whole module exists to avoid.
  assert.equal(toDateKey(new Date(2026, 0, 1, 23, 30)), "2026-01-01");
  // Early morning local rolls back a day east of UTC under the same bug.
  assert.equal(toDateKey(new Date(2026, 0, 1, 0, 30)), "2026-01-01");
});

test("date keys round-trip through parsing", () => {
  for (const key of ["2026-01-01", "2026-03-08", "2026-12-31", "2028-02-29"]) {
    assert.equal(toDateKey(fromDateKey(key)), key, key);
  }
});

test("isValidDateKey rejects impossible dates", () => {
  assert.ok(isValidDateKey("2028-02-29"), "2028 is a leap year");
  assert.ok(!isValidDateKey("2026-02-29"), "2026 is not");
  assert.ok(!isValidDateKey("2026-02-30"));
  assert.ok(!isValidDateKey("2026-13-01"));
  assert.ok(!isValidDateKey("not-a-date"));
  assert.ok(!isValidDateKey(""));
});

test("daysBetween is DST-proof", () => {
  // Spans the US spring-forward; a naive ms/86400000 gives 1.958 -> 1.
  assert.equal(daysBetween("2026-03-07", "2026-03-09"), 2);
  // Spans the autumn fall-back.
  assert.equal(daysBetween("2026-10-31", "2026-11-02"), 2);
  assert.equal(daysBetween("2025-12-31", "2026-01-01"), 1);
  assert.equal(daysBetween("2026-01-01", "2026-01-01"), 0);
});

test("daysInYear covers leap and common years exactly", () => {
  assert.equal(daysInYear(2026).length, 365);
  assert.equal(daysInYear(2028).length, 366);
  assert.equal(daysInYear(2026)[0], "2026-01-01");
  assert.equal(daysInYear(2026).at(-1), "2026-12-31");
});

test("startOfWeek respects the week-start setting", () => {
  // 2026-08-17 is a Monday.
  assert.equal(startOfWeek("2026-08-17", 1), "2026-08-17");
  assert.equal(startOfWeek("2026-08-17", 0), "2026-08-16");
  assert.equal(startOfWeek("2026-08-23", 1), "2026-08-17", "Sunday belongs to the Monday week");
});

test("weekdayOrder rotates to the configured first day", () => {
  assert.deepEqual(weekdayOrder(1), [1, 2, 3, 4, 5, 6, 0]);
  assert.deepEqual(weekdayOrder(0), [0, 1, 2, 3, 4, 5, 6]);
});
