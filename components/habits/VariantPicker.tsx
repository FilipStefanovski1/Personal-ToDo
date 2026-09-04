"use client";

import { readableOn, withAlpha } from "@/lib/colors";

/**
 * The optional follow-up to completing a habit that defines variants —
 * Gym → Push / Pull / Legs.
 *
 * It only appears once the habit is already checked off, which is the whole
 * point: completing stays a single tap and is never gated behind a choice.
 * Labelling it is a second, entirely optional tap, and tapping the active
 * chip again clears it.
 */
export function VariantPicker({
  variants,
  selected,
  color,
  onSelect,
}: {
  variants: string[];
  selected: string | null;
  color: string;
  onSelect: (variant: string | null) => void;
}) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5 pl-[54px]">
      {variants.map((variant) => {
        const active = selected === variant;
        return (
          <button
            key={variant}
            type="button"
            onClick={() => onSelect(active ? null : variant)}
            aria-pressed={active}
            className={[
              "rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-all duration-150",
              "active:scale-95",
              active ? "" : "text-ink-muted hover:text-ink",
            ].join(" ")}
            style={
              active
                ? { background: color, color: readableOn(color) }
                : { background: withAlpha(color, 0.1) }
            }
          >
            {variant}
          </button>
        );
      })}
    </div>
  );
}
