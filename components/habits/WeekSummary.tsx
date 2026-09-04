"use client";

import type { DateKey } from "@/types";
import type { WeekSummary as Summary } from "@/lib/stats";
import { DAY_INITIALS, fromDateKey } from "@/lib/dates";

/**
 * The week in one calm row.
 *
 * Deliberately measured in goal attainment, not habit colour — the coloured
 * strips elsewhere already answer "what did I do", and this answers the
 * different question you actually ask mid-week: "am I on track?"
 */
export function WeekSummary({
  summary,
  onSelectDay,
}: {
  summary: Summary;
  onSelectDay: (date: DateKey) => void;
}) {
  const { days, daysOnTrack, daysJudged, totalCompletions, completionsDelta: delta } = summary;

  return (
    <section className="rounded-card border border-line bg-surface p-5">
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          This week
        </h2>
        <p className="text-[12.5px] tabular text-ink-muted">
          {daysJudged === 0 ? (
            "Just started"
          ) : (
            <>
              <span className="font-semibold text-ink">{daysOnTrack}</span> of {daysJudged} days on
              track
            </>
          )}
        </p>
      </div>

      <div className="flex gap-1.5">
        {days.map((day) => {
          const weekday = DAY_INITIALS[fromDateKey(day.date).getDay()];
          // Fill shows how much of the day's goals landed, so a partial day
          // reads as partial rather than as a failure.
          const share = day.judged === 0 ? 0 : day.met / day.judged;
          // A fully-met day is solid; a partial one is proportional but muted.
          // Proportional height alone was unreadable — 67% and 100% looked
          // identical at this size, which defeats the "am I on track?" glance.
          const complete = day.judged > 0 && day.met === day.judged;

          return (
            <button
              key={day.date}
              type="button"
              disabled={day.isFuture}
              onClick={() => onSelectDay(day.date)}
              aria-label={`${day.date}, ${day.met} of ${day.judged} goals met`}
              className={[
                "group flex flex-1 flex-col items-center gap-1.5 rounded-xl py-1.5 transition-colors",
                day.isFuture ? "cursor-default opacity-40" : "hover:bg-sunken",
              ].join(" ")}
            >
              <span
                className={[
                  "text-[10px] font-semibold uppercase tracking-wider",
                  day.isToday ? "text-ink" : "text-ink-muted",
                ].join(" ")}
              >
                {weekday}
              </span>

              <span
                aria-hidden
                className={[
                  "relative flex h-7 w-full items-end overflow-hidden rounded-md",
                  day.isToday ? "ring-1 ring-ink/40" : "",
                ].join(" ")}
                style={{ background: "var(--cell-empty)" }}
              >
                {day.isSick ? (
                  <span className="absolute inset-0" style={{ background: "#E5484D22" }} />
                ) : null}
                <span
                  className={[
                    "w-full rounded-md transition-[height] duration-300",
                    complete ? "bg-ink" : "bg-ink/30",
                  ].join(" ")}
                  style={{ height: `${Math.round(share * 100)}%` }}
                />
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3.5 text-[12.5px] text-ink-muted">
        <span className="font-semibold tabular text-ink-soft">{totalCompletions}</span> completions
        {delta !== null && delta !== 0 ? (
          <> · {delta > 0 ? "+" : ""}{delta} vs last week</>
        ) : null}
        {summary.topHabitName ? (
          <>
            {" · "}
            {summary.topHabitName}{" "}
            <span className="font-semibold tabular text-ink-soft">{summary.topHabitCount}×</span>
          </>
        ) : null}
      </p>
    </section>
  );
}
