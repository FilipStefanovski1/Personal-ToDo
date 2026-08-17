import type { AppData } from "@/types";
import type { StorageProvider } from "./provider";
import { migrateStoredData } from "@/lib/migrations";

const STORAGE_KEY = "habit-year:v1";

/**
 * Browser localStorage implementation of `StorageProvider`.
 *
 * Reads go through `migrateStoredData`, which validates the blob (so a
 * corrupted or hand-edited one degrades to sane defaults instead of crashing)
 * and upgrades older schema versions.
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
        return migrateStoredData(JSON.parse(raw));
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
