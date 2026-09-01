"use client";

import { Check } from "lucide-react";

/**
 * A plain red override for a whole day: mark it "sick" and every category's
 * goal is excused — nothing due, nothing missed, streaks untouched. Anything
 * actually logged that day still counts; this only waives the requirement.
 *
 * Deliberately not styled like a habit — no color picker, no emoji choice.
 * It's a single fixed switch, always red, so it reads as an exception rather
 * than another thing to track.
 */
export function SickDayToggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={`Feeling sick, ${active ? "marked" : "not marked"}`}
      className={[
        "flex w-full items-center gap-3.5 rounded-2xl border px-3.5 py-3 text-left",
        "transition-all duration-200 active:scale-[0.99]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5484D]",
        active
          ? "border-transparent bg-[#E5484D] text-white"
          : "border-[#E5484D]/35 bg-[#E5484D]/6 hover:bg-[#E5484D]/10",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "grid size-10 shrink-0 place-items-center rounded-xl text-[18px]",
          active ? "bg-white/20" : "bg-[#E5484D]/14",
        ].join(" ")}
      >
        🤒
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={[
            "block text-[15px] font-semibold tracking-tight",
            active ? "text-white" : "text-[#D3383D] dark:text-[#FF9592]",
          ].join(" ")}
        >
          Feeling sick
        </span>
        <span
          className={[
            "mt-0.5 block text-[12.5px]",
            active ? "text-white/80" : "text-[#D3383D]/70 dark:text-[#FF9592]/70",
          ].join(" ")}
        >
          {active ? "Marked — nothing counted against you today" : "Excuse today, no questions asked"}
        </span>
      </span>

      <span
        aria-hidden
        className={[
          "grid size-7 shrink-0 place-items-center rounded-full transition-all duration-200",
          active ? "bg-white" : "border-2 border-[#E5484D]/40",
        ].join(" ")}
      >
        {active ? <Check size={16} strokeWidth={3.2} className="text-[#E5484D]" /> : null}
      </span>
    </button>
  );
}
