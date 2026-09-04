"use client";

import { useEffect, useState } from "react";

/**
 * Tracks a media query in React state.
 *
 * Starts false and resolves after mount, so the server render and the first
 * client render agree — reading `matchMedia` during render would hydrate
 * mismatched. Anything using this must look correct in its `false` state for
 * one frame.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/** Matches Tailwind's `lg` breakpoint, where the month view gains its side panel. */
export const LG_QUERY = "(min-width: 1024px)";
