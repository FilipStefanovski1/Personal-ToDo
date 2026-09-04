"use client";

import { useMemo } from "react";
import type { DateKey } from "@/types";
import { useStore } from "@/lib/store";
import { DAY_NAMES, fromDateKey } from "@/lib/dates";
import { SectionLabel } from "@/components/ui/Card";

/**
 * The month's notes, read back in one place.
 *
 * Without this, notes are write-only: you can record "squat PR" but the only
 * way to ever see it again is to land on that exact day. A month at a glance
 * is what turns the notes into a record you'd actually revisit.
 */
export function MonthJournal({
  year,
  month,
  onSelectDay,
}: {
  year: number;
  month: number;
  onSelectDay: (date: DateKey) => void;
}) {
  const { data } = useStore();

  /**
   * Notes and moments interleaved by date. A month is read back as one
   * sequence of days, not as two parallel lists — a day that carries both
   * shows both, under one date.
   */
  const entries = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const byDate = new Map<DateKey, { note?: string; moments: typeof data.moments }>();

    for (const [date, text] of Object.entries(data.notes)) {
      if (!date.startsWith(prefix)) continue;
      byDate.set(date, { note: text, moments: [] });
    }
    for (const moment of data.moments) {
      if (!moment.date.startsWith(prefix)) continue;
      const entry = byDate.get(moment.date) ?? { moments: [] };
      entry.moments = [...entry.moments, moment];
      byDate.set(moment.date, entry);
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => b.localeCompare(a)) // newest first
      .map(([date, value]) => ({ date, ...value }));
  }, [data.notes, data.moments, year, month]);

  if (entries.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionLabel>
        {entries.length} {entries.length === 1 ? "day" : "days"} worth remembering
      </SectionLabel>

      <div className="space-y-px overflow-hidden rounded-card border border-line bg-surface">
        {entries.map(({ date, note, moments }) => {
          const parsed = fromDateKey(date);
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDay(date)}
              className="flex w-full items-start gap-4 px-4 py-3 text-left transition-colors hover:bg-sunken/60"
            >
              <span className="flex w-11 shrink-0 flex-col items-center pt-0.5">
                <span className="text-[16px] font-bold leading-none tabular">
                  {parsed.getDate()}
                </span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                  {DAY_NAMES[parsed.getDay()].slice(0, 3)}
                </span>
              </span>
              <span className="min-w-0 flex-1 space-y-1">
                {moments.map((moment) => (
                  <span
                    key={moment.id}
                    className="flex items-center gap-1.5 text-[13.5px] font-semibold tracking-tight"
                  >
                    <span aria-hidden>{moment.emoji}</span>
                    {moment.title}
                  </span>
                ))}
                {note ? (
                  <span className="block whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-soft">
                    {note}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
