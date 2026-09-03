"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

/**
 * A plain red override for a whole day: mark it "sick" and every category's
 * goal is excused — nothing due, nothing missed, streaks untouched. Anything
 * actually logged that day still counts; this only waives the requirement.
 *
 * Floats as a fixed pill in the bottom corner rather than sitting inline atop
 * the checklist — it's an exception you reach for occasionally, not the first
 * thing the list should be about. Sits above the mobile tab bar on small
 * screens and drops to the corner once there's no tab bar to clear.
 *
 * Portaled to `document.body`: this button lives inside the page's
 * `animate-rise` entrance wrapper, and that animation's `transform` (even
 * once settled on its identity value) establishes a new containing block for
 * `position: fixed` descendants — without the portal this pins itself to the
 * bottom of that wrapper's box, not the viewport, and can end up rendered far
 * below the fold on a tall page instead of staying docked on screen.
 */
export function SickDayToggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={`Feeling sick, ${active ? "marked" : "not marked"}`}
      className={[
        "fixed z-40 flex items-center gap-2 rounded-full border pl-2.5 pr-4 py-2.5",
        "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 md:bottom-6 md:right-6",
        "shadow-[0_6px_20px_rgba(0,0,0,0.16)] backdrop-blur-sm",
        "transition-all duration-200 active:scale-[0.96]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5484D]",
        active
          ? "border-transparent bg-[#E5484D] text-white"
          : "border-[#E5484D]/30 bg-surface/95 text-[#D3383D] hover:bg-[#E5484D]/8 dark:text-[#FF9592]",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "grid size-6 shrink-0 place-items-center rounded-full text-[13px]",
          active ? "bg-white/20" : "bg-[#E5484D]/12",
        ].join(" ")}
      >
        {active ? <Check size={13} strokeWidth={3.2} className="text-white" /> : "🤒"}
      </span>
      <span className="text-[13px] font-semibold tracking-tight">
        {active ? "Marked sick" : "Feeling sick"}
      </span>
    </button>,
    document.body,
  );
}
