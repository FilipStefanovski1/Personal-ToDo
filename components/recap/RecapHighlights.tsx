"use client";

import { useMemo, useState } from "react";
import type { YearHighlight } from "@/lib/goals";
import { DAY_NAMES, MONTH_SHORT, fromDateKey } from "@/lib/dates";
import { Card, SectionLabel } from "@/components/ui/Card";

/**
 * What mattered, told in order rather than newest-first — the live Year page
 * leads with the most recent entry because that's what you'd look for
 * mid-year, but a finished-year recap reads better as a story from January
 * to December.
 *
 * A hand-marked moment and a goal milestone are not the same size here on
 * purpose: a moment gets its own row with its emoji and full weight, and a
 * milestone sits underneath as a compact line with a colour dot. Reaching 75
 * gym sessions is real, but "Shipped Aminta v1" is the one you'd tell someone
 * about — the layout should agree.
 */
export function RecapHighlights({ highlights }: { highlights: YearHighlight[] }) {
  const [expanded, setExpanded] = useState(false);

  const chronological = useMemo(() => [...highlights].reverse(), [highlights]);

  // With a lot of goals running at once, milestones can crowd out moments.
  // Past a soft cap, keep every moment and only the milestones that are a
  // goal's own target — the 25/50/75% checkpoints stay in the Goals section.
  const condensed = useMemo(() => {
    if (chronological.length <= 16) return chronological;
    return chronological.filter((h) => h.kind === "moment" || h.isTarget);
  }, [chronological]);

  const shown = expanded ? chronological : condensed;
  const hiddenCount = chronological.length - condensed.length;

  if (highlights.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionLabel>What mattered</SectionLabel>
        <p className="text-[12px] text-ink-muted">{highlights.length} this year</p>
      </div>

      <Card className="divide-y divide-line overflow-hidden">
        {shown.map((entry) => {
          const date = fromDateKey(entry.date);
          if (entry.kind === "moment") {
            return (
              <div key={entry.key} className="flex items-center gap-3.5 px-4 py-3.5">
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-[17px]"
                >
                  {entry.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold tracking-tight">
                    {entry.title}
                  </span>
                  <span className="text-[11.5px] text-ink-muted">
                    {DAY_NAMES[date.getDay()]}, {MONTH_SHORT[date.getMonth()]} {date.getDate()}
                  </span>
                </span>
              </div>
            );
          }
          return (
            <div key={entry.key} className="flex items-center gap-3.5 px-4 py-2 pl-[19px]">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-[2.5px]"
                style={{ background: entry.color }}
              />
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-soft">
                {entry.title}
              </span>
              <span className="shrink-0 text-[11px] tabular text-ink-muted">
                {MONTH_SHORT[date.getMonth()]} {date.getDate()}
              </span>
            </div>
          );
        })}
      </Card>

      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[12.5px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          {expanded ? "Show fewer" : `Show ${hiddenCount} more checkpoint${hiddenCount === 1 ? "" : "s"}`}
        </button>
      ) : null}
    </section>
  );
}
