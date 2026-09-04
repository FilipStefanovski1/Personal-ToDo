"use client";

import type { MonthBreakdown } from "@/lib/recap";
import { MONTH_SHORT } from "@/lib/dates";

/**
 * The shape of a year in one row — twelve columns rather than twelve cards.
 *
 * Each column carries two independent, geometric readings rather than a
 * single color: the tall bar is completions relative to the year's busiest
 * month, and the thin bar beneath it is that month's consistency. Neither
 * depends on color to be legible — height alone tells the story, and the
 * small dot marks a month that also held a moment or a milestone.
 */
export function MonthRhythmStrip({ breakdown }: { breakdown: MonthBreakdown[] }) {
  const maxCompletions = Math.max(1, ...breakdown.map((m) => (m.isFuture ? 0 : m.completions)));

  return (
    <div className="flex items-end gap-1.5 sm:gap-2.5">
      {breakdown.map((month) => {
        const barPct = month.isFuture ? 0 : Math.round((month.completions / maxCompletions) * 100);
        const hasMark = month.momentCount + month.milestoneCount > 0;
        const label = month.isFuture
          ? `${MONTH_SHORT[month.month]}: not yet reached`
          : `${MONTH_SHORT[month.month]}: ${month.completions} completions` +
            (month.consistency !== null ? `, ${month.consistency}% consistency` : "") +
            (hasMark ? `, ${month.momentCount + month.milestoneCount} marked` : "");

        return (
          <div key={month.month} className="flex flex-1 flex-col items-center gap-1.5" title={label}>
            <span
              aria-hidden
              className={`size-1 rounded-full ${hasMark ? "bg-ink/50" : "bg-transparent"}`}
            />
            <div
              className={[
                "relative flex h-20 w-full items-end justify-center rounded-[6px] sm:h-24",
                month.isFuture ? "border border-dashed border-line" : "bg-sunken",
              ].join(" ")}
            >
              {!month.isFuture ? (
                <div
                  className="w-full rounded-[5px] bg-ink transition-[height] duration-500 ease-out dark:bg-ink"
                  style={{ height: `${Math.max(barPct === 0 && month.completions === 0 ? 0 : 6, barPct)}%` }}
                />
              ) : null}
            </div>
            <div
              className="h-[3px] w-full overflow-hidden rounded-full bg-line"
              aria-hidden
            >
              {month.consistency !== null ? (
                <div
                  className="h-full rounded-full bg-ink/60"
                  style={{ width: `${month.consistency}%` }}
                />
              ) : null}
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              {MONTH_SHORT[month.month]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
