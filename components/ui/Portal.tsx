"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children into `document.body`.
 *
 * Every page wrapper in this app carries the `animate-rise` entrance
 * animation, and a settled CSS `transform` — even at its identity value —
 * establishes a containing block for `position: fixed` descendants. Anything
 * fixed that renders inside a page therefore anchors to that wrapper's box
 * instead of the viewport: overlays stop covering the screen, and dialogs
 * drift off the top of it once the page is scrolled.
 *
 * Portaling out of the page subtree is the fix. Any new fixed-position
 * overlay, dialog or floating control should go through this.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // Portals need a DOM node, which doesn't exist during the server render.
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(children, document.body);
}
