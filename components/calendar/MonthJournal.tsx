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

  const entries = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    return Object.entries(data.notes)
      .filter(([date]) => date.startsWith(prefix))
      .sort(([a], [b]) => b.localeCompare(a)) // newest first
      .map(([date, text]) => ({ date, text }));
  }, [data.notes, year, month]);

  if (entries.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionLabel>
        {entries.length} {entries.length === 1 ? "note" : "notes"} this month
      </SectionLabel>

      <div className="space-y-px overflow-hidden rounded-card border border-line bg-surface">
        {entries.map(({ date, text }) => {
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
              <span className="min-w-0 flex-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-soft">
                {text}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
