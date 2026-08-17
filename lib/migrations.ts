import type { AppData, CompletionMap } from "@/types";
import { SCHEMA_VERSION, normalizeAppData } from "./normalize";
import { todayKey } from "./dates";

/**
 * One-time removal of the generated history that earlier versions seeded on
 * first launch.
 *
 * Completions are stored as bare habit ids under a date key — there is no
 * timestamp or provenance flag, so individual records carry nothing that
 * distinguishes a generated one from a real one.
 *
 * What *is* reliable is the shape of the problem: the generator only ever ran
 * once, at first launch, writing a contiguous block of days ending on the day
 * of install. Anything dated before today therefore cannot be something the
 * user recorded by hand in this session, while today's entries may well be
 * real. So this drops everything before today and keeps today untouched.
 *
 * That is the conservative direction: it can leave a few generated entries on
 * the install day, but it can never delete a real one. Settings → Clear all
 * history is there for anyone who wants a true zero.
 */
export function stripGeneratedHistory(completions: CompletionMap): CompletionMap {
  const today = todayKey();
  const kept: CompletionMap = {};
  for (const [date, ids] of Object.entries(completions)) {
    if (date >= today) kept[date] = ids;
  }
  return kept;
}

/**
 * Applied to data read from storage, never to imports.
 *
 * An import is an explicit act — if someone restores a backup that contains
 * history, that history is theirs and must survive untouched. Only the
 * upgrade path from a version that shipped a demo generator is cleaned.
 */
export function migrateStoredData(raw: unknown): AppData {
  const incomingVersion =
    raw && typeof raw === "object" && typeof (raw as { version?: unknown }).version === "number"
      ? (raw as { version: number }).version
      : 0;

  const data = normalizeAppData(raw);

  // v3 is the first version that never seeds completions.
  if (incomingVersion < 3) {
    return {
      ...data,
      version: SCHEMA_VERSION,
      completions: stripGeneratedHistory(data.completions),
    };
  }

  return data;
}
