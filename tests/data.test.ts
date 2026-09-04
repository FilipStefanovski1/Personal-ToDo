import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeAppData, normalizeNotes, normalizeSickDays } from "@/lib/normalize";
import { migrateStoredData, stripGeneratedHistory } from "@/lib/migrations";
import { exportToJson, parseImport, ImportError } from "@/lib/transfer";
import { createSeedData } from "@/lib/seed";
import { shiftKey, todayKey } from "@/lib/dates";

/**
 * Data integrity. Historical records matter more than any feature, so these
 * guard the paths where real history could be silently lost: normalisation,
 * schema migration, and export/import.
 */

const today = todayKey();

test("a fresh install has structure but zero history", () => {
  const seed = createSeedData();
  assert.equal(Object.keys(seed.completions).length, 0);
  assert.equal(seed.sickDays.length, 0);
  assert.equal(Object.keys(seed.notes).length, 0);
  assert.equal(seed.categories.length, 3);
  assert.equal(seed.habits.length, 10);
  assert.ok(
    seed.habits.every((h) => h.categoryId),
    "every seeded habit belongs to a category",
  );
});

test("normalisation drops junk without throwing", () => {
  const data = normalizeAppData({
    habits: [null, 42, "nope"],
    completions: { "not-a-date": ["x"], "2026-02-30": ["x"] },
    sickDays: ["2026-01-01", "2026-01-01", "bad", 7],
    notes: { "2026-01-01": "  kept  ", "2026-01-02": "   ", "bad": "dropped" },
  });
  assert.equal(data.habits.length, 0);
  assert.equal(Object.keys(data.completions).length, 0);
  assert.deepEqual(data.sickDays, ["2026-01-01"]);
  assert.deepEqual(data.notes, { "2026-01-01": "kept" }, "trimmed; blank dropped");
});

test("notes are trimmed, capped, and never stored empty", () => {
  const long = "x".repeat(900);
  const notes = normalizeNotes({ "2026-01-01": long, "2026-01-02": "" });
  assert.equal(notes["2026-01-01"].length, 500);
  assert.ok(!("2026-01-02" in notes));
});

test("sick days are deduped and sorted", () => {
  assert.deepEqual(
    normalizeSickDays(["2026-03-02", "2026-01-01", "2026-03-02"]),
    ["2026-01-01", "2026-03-02"],
  );
});

test("a habit pointing at a missing category is rescued, not dropped", () => {
  const data = normalizeAppData({
    categories: [{ id: "real", name: "Real", order: 0, goalType: "all", goalTarget: 1 }],
    habits: [
      { id: "a", categoryId: "real", name: "Kept", color: "#3B9EF5", schedule: { type: "daily" }, order: 0, createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "b", categoryId: "ghost", name: "Rescued", color: "#3B9EF5", schedule: { type: "daily" }, order: 1, createdAt: "2026-01-01T00:00:00.000Z" },
    ],
    completions: {},
  });
  assert.equal(data.habits.length, 2, "nothing vanishes");
  const rescued = data.habits.find((h) => h.id === "b")!;
  const home = data.categories.find((c) => c.id === rescued.categoryId)!;
  assert.equal(home.name, "Other");
});

test("habit order is scoped per category, not globally", () => {
  const seed = createSeedData();
  for (const category of seed.categories) {
    const items = seed.habits
      .filter((h) => h.categoryId === category.id)
      .sort((a, b) => a.order - b.order);
    assert.deepEqual(
      items.map((h) => h.order),
      items.map((_, i) => i),
      `${category.name} numbered 0..n-1`,
    );
  }
});

// --- migrations -----------------------------------------------------------

test("the v2 demo-history migration keeps today and drops earlier days", () => {
  const generated = {
    [shiftKey(today, -30)]: ["a"],
    [shiftKey(today, -1)]: ["a"],
    [today]: ["a", "b"],
  };
  const kept = stripGeneratedHistory(generated);
  assert.deepEqual(Object.keys(kept), [today]);
  assert.equal(kept[today].length, 2, "today's records survive untouched");
});

test("loading pre-v3 storage strips generated history but keeps everything else", () => {
  const migrated = migrateStoredData({
    version: 2,
    categories: [{ id: "c1", name: "Supplements", order: 0, goalType: "all", goalTarget: 1 }],
    habits: [
      { id: "a", categoryId: "c1", name: "Vitamin C", color: "#F5B814", schedule: { type: "daily" }, order: 0, createdAt: "2026-01-01T00:00:00.000Z" },
    ],
    completions: { [shiftKey(today, -5)]: ["a"], [today]: ["a"] },
    settings: { theme: "dark", weekStartsOn: 1, cellSize: "md", showArchived: false },
  });
  assert.deepEqual(Object.keys(migrated.completions), [today]);
  assert.equal(migrated.habits.length, 1);
  assert.equal(migrated.settings.theme, "dark", "preferences survive");
  assert.equal(migrated.version, 5);
});

test("loading current-schema storage never strips real history", () => {
  const history = { "2026-01-05": ["a"], "2026-02-06": ["a"], [today]: ["a"] };
  const loaded = migrateStoredData({
    version: 5,
    categories: [{ id: "c1", name: "S", order: 0, goalType: "all", goalTarget: 1 }],
    habits: [
      { id: "a", categoryId: "c1", name: "V", color: "#F5B814", schedule: { type: "daily" }, order: 0, createdAt: "2026-01-01T00:00:00.000Z" },
    ],
    completions: history,
    settings: {},
  });
  assert.equal(Object.keys(loaded.completions).length, 3);
});

// --- export / import ------------------------------------------------------

test("export/import round-trips every record type", () => {
  const seed = createSeedData();
  seed.completions[today] = [seed.habits[0].id, seed.habits[6].id];
  seed.sickDays = [shiftKey(today, -1)];
  seed.notes = { [today]: "squat PR" };

  const restored = parseImport(exportToJson(seed));

  assert.equal(restored.categories.length, seed.categories.length);
  assert.equal(restored.habits.length, seed.habits.length);
  assert.deepEqual(restored.completions[today].sort(), seed.completions[today].sort());
  assert.deepEqual(restored.sickDays, seed.sickDays);
  assert.deepEqual(restored.notes, seed.notes);
  assert.deepEqual(
    restored.categories.map((c) => c.goalType),
    seed.categories.map((c) => c.goalType),
  );
});

test("importing a backup never strips its history, however old", () => {
  // Imports are explicit acts — unlike a storage load, they skip migration.
  const backup = JSON.stringify({
    app: "habit-year",
    version: 2,
    categories: [{ id: "c1", name: "S", order: 0, goalType: "all", goalTarget: 1 }],
    habits: [
      { id: "a", categoryId: "c1", name: "V", color: "#F5B814", schedule: { type: "daily" }, order: 0, createdAt: "2026-01-01T00:00:00.000Z" },
    ],
    completions: [
      { habitId: "a", date: "2026-01-02" },
      { habitId: "a", date: shiftKey(today, -10) },
    ],
    settings: {},
  });
  assert.equal(Object.keys(parseImport(backup).completions).length, 2);
});

test("import rejects malformed files with a usable error", () => {
  assert.throws(() => parseImport("not json"), ImportError);
  assert.throws(() => parseImport('{"foo":1}'), ImportError);
});

test("import drops completions referencing habits that no longer exist", () => {
  const bundle = JSON.stringify({
    habits: [
      { id: "a", categoryId: "c1", name: "V", color: "#F5B814", schedule: { type: "daily" }, order: 0, createdAt: "2026-01-01T00:00:00.000Z" },
    ],
    categories: [{ id: "c1", name: "S", order: 0, goalType: "all", goalTarget: 1 }],
    completions: [
      { habitId: "a", date: "2026-05-01" },
      { habitId: "ghost", date: "2026-05-01" },
    ],
    settings: {},
  });
  assert.deepEqual(parseImport(bundle).completions["2026-05-01"], ["a"]);
});
