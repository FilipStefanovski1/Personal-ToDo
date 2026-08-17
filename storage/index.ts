import type { StorageProvider } from "./provider";
import { createLocalStorageProvider } from "./localStorageProvider";

export type { StorageProvider } from "./provider";

/**
 * The active provider for the app.
 *
 * To move to a backend later, add `storage/supabaseProvider.ts` implementing
 * `StorageProvider` and return it from here (e.g. behind an env check):
 *
 *   return process.env.NEXT_PUBLIC_SUPABASE_URL
 *     ? createSupabaseProvider()
 *     : createLocalStorageProvider();
 */
export function getStorageProvider(): StorageProvider {
  return createLocalStorageProvider();
}
