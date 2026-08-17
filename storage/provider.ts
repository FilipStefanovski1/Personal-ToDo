import type { AppData } from "@/types";

/**
 * The single seam between the app and where data physically lives.
 *
 * The whole app talks to this interface via `lib/store.tsx` and never touches
 * `window.localStorage` directly. Swapping in Supabase later means writing a
 * `supabaseProvider.ts` that satisfies this contract and changing the one
 * export in `storage/index.ts` — no component or hook changes.
 *
 * Every method is async precisely so a network-backed provider drops in
 * without changing a single call site.
 */
export interface StorageProvider {
  /** Returns null when nothing has been persisted yet (first launch). */
  load(): Promise<AppData | null>;
  /** Persists the full snapshot. Callers debounce; providers may batch. */
  save(data: AppData): Promise<void>;
  /** Removes everything this provider owns. */
  clear(): Promise<void>;
}
