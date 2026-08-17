import type { AppData } from "@/types";
import type { StorageProvider } from "./provider";
import { normalizeAppData } from "@/lib/normalize";

const STORAGE_KEY = "habit-year:v1";

/**
 * Browser localStorage implementation of `StorageProvider`.
 *
 * Reads are validated through `normalizeAppData` so a corrupted or
 * hand-edited blob degrades to sane defaults instead of crashing the app.
 */
export function createLocalStorageProvider(
  key: string = STORAGE_KEY,
): StorageProvider {
  const available = () => typeof window !== "undefined" && !!window.localStorage;

  return {
    async load(): Promise<AppData | null> {
      if (!available()) return null;
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        return normalizeAppData(JSON.parse(raw));
      } catch {
        // Unparseable data: treat as a first launch rather than hard-failing.
        return null;
      }
    },

    async save(data: AppData): Promise<void> {
      if (!available()) return;
      try {
        window.localStorage.setItem(key, JSON.stringify(data));
      } catch {
        // Quota exceeded or private-mode write failure — the in-memory state
        // stays correct for this session, so don't interrupt the user.
      }
    },

    async clear(): Promise<void> {
      if (!available()) return;
      window.localStorage.removeItem(key);
    },
  };
}
