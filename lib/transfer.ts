import type { AppData, CompletionMap, ExportBundle, HabitCompletion } from "@/types";
import { SCHEMA_VERSION, normalizeAppData } from "./normalize";
import { isValidDateKey } from "./dates";

/**
 * Export uses a flat `HabitCompletion[]` rather than the internal date-keyed
 * map: it's the more portable shape, and it's what a future SQL table looks
 * like row-for-row.
 */
export function toExportBundle(data: AppData): ExportBundle {
  const completions: HabitCompletion[] = [];
  for (const [date, ids] of Object.entries(data.completions)) {
    for (const habitId of ids) completions.push({ habitId, date });
  }
  completions.sort((a, b) => (a.date === b.date ? a.habitId.localeCompare(b.habitId) : a.date.localeCompare(b.date)));

  return {
    app: "habit-year",
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    categories: data.categories,
    habits: data.habits,
    completions,
    sickDays: data.sickDays,
    notes: data.notes,
    variants: data.variants,
    goals: data.goals,
    moments: data.moments,
    settings: data.settings,
  };
}

export function exportToJson(data: AppData): string {
  return JSON.stringify(toExportBundle(data), null, 2);
}

export class ImportError extends Error {}

/** Accepts both the flat export bundle and a raw internal snapshot. */
export function parseImport(json: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new ImportError("That file isn't valid JSON.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new ImportError("That file doesn't contain habit data.");
  }

  const raw = parsed as Record<string, unknown>;
  if (!Array.isArray(raw.habits)) {
    throw new ImportError("That file doesn't contain a habits list.");
  }

  let completions: CompletionMap = {};
  if (Array.isArray(raw.completions)) {
    for (const entry of raw.completions) {
      if (!entry || typeof entry !== "object") continue;
      const { habitId, date } = entry as Record<string, unknown>;
      if (typeof habitId !== "string" || typeof date !== "string" || !isValidDateKey(date)) continue;
      (completions[date] ??= []).push(habitId);
    }
  } else if (raw.completions && typeof raw.completions === "object") {
    completions = raw.completions as CompletionMap;
  }

  // `categories` may be absent (a v1 export) — normalisation migrates those
  // habits into a fallback group rather than dropping them.
  return normalizeAppData({
    version: SCHEMA_VERSION,
    categories: raw.categories,
    habits: raw.habits,
    completions,
    sickDays: raw.sickDays,
    notes: raw.notes,
    variants: raw.variants,
    goals: raw.goals,
    moments: raw.moments,
    settings: raw.settings,
  });
}

export function downloadJson(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
