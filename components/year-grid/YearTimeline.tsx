"use client";

import type { YearHighlight } from "@/lib/goals";
import { DAY_NAMES, MONTH_SHORT, fromDateKey } from "@/lib/dates";

/**
 * The year's story in one column — milestones crossed and moments marked,
 * newest first.
 *
 * This is what turns the page from a chart into an archive: in December it
 * should read back as "here is what happened", not "here are your metrics".
 */
export function YearTimeline({
  highlights,
  onSelectDay,
}: {
  highlights: YearHighlight[];
  onSelectDay: (date: string) => void;
}) {
  return (
    <ol className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {highlights.map((entry) => {
        const date = fromDateKey(entry.date);
        return (
          <li key={entry.key}>
            <button
              type="button"
              onClick={() => onSelectDay(entry.date)}
              className="flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-sunken/60"
            >
              <span className="flex w-12 shrink-0 flex-col items-center">
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                  {MONTH_SHORT[date.getMonth()]}
                </span>
                <span className="text-[15px] font-bold leading-none tabular">{date.getDate()}</span>
              </span>

              <span
                aria-hidden
                className="grid size-6 shrink-0 place-items-center text-[14px]"
              >
                {entry.kind === "moment" ? (
                  entry.emoji
                ) : (
                  <span
                    className="size-2.5 rounded-[3px]"
                    style={{ background: entry.color }}
                  />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={[
                    "block truncate text-[13.5px]",
                    entry.kind === "moment"
                      ? "font-semibold tracking-tight"
                      : "text-ink-soft",
                  ].join(" ")}
                >
                  {entry.title}
                </span>
              </span>

              <span className="hidden shrink-0 text-[11px] text-ink-muted sm:block">
                {DAY_NAMES[date.getDay()].slice(0, 3)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
