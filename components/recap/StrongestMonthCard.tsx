"use client";

import type { StrongestMonth } from "@/lib/recap";
import { MONTH_NAMES } from "@/lib/dates";
import { Card, SectionLabel } from "@/components/ui/Card";

/**
 * The one month worth naming out loud. Picked by consistency, not volume — a
 * month with a lot of taps but a broken streak isn't the strongest one.
 */
export function StrongestMonthCard({ month }: { month: StrongestMonth }) {
  return (
    <section className="space-y-3">
      <SectionLabel>Strongest month</SectionLabel>
      <Card className="p-5 md:p-6">
        <p className="text-[26px] font-bold uppercase leading-none tracking-[-0.02em] md:text-[30px]">
          {MONTH_NAMES[month.month]}
        </p>
        <p className="mt-2 text-[13.5px] text-ink-muted">
          <span className="font-semibold text-ink">{month.consistency}%</span> consistency ·{" "}
          <span className="font-semibold text-ink">{month.completions}</span> completions
        </p>

        {month.topHabits.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {month.topHabits.map((habit) => (
              <span
                key={habit.habitId}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-sunken px-2.5 py-1 text-[12px] font-medium tracking-tight"
              >
                <span
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ background: habit.color }}
                />
                {habit.name} · {habit.count}
              </span>
            ))}
          </div>
        ) : null}
      </Card>
    </section>
  );
}
