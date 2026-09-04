"use client";

import type { HabitStory } from "@/lib/recap";
import { MONTH_NAMES } from "@/lib/dates";
import { Card, SectionLabel } from "@/components/ui/Card";

/**
 * A short paragraph for the habits that actually carried the year. Not every
 * habit gets one — the ones with too little data to say anything already have
 * a place in Statistics, and repeating them here would be padding.
 */
export function HabitStories({ stories }: { stories: HabitStory[] }) {
  if (stories.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionLabel>The year in habits</SectionLabel>
      <div className="grid gap-3 sm:grid-cols-2">
        {stories.map(({ habit, totalCompletions, bestMonth, topVariant }) => (
          <Card key={habit.id} className="p-4">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ background: habit.color }}
              />
              <p className="truncate text-[13.5px] font-semibold tracking-tight">{habit.name}</p>
            </div>
            <p className="mt-2 text-[22px] font-bold leading-none tracking-[-0.02em]">
              {totalCompletions}
              <span className="text-[13px] font-semibold text-ink-muted"> sessions</span>
            </p>
            <div className="mt-2.5 space-y-1 text-[12px] text-ink-muted">
              {bestMonth ? (
                <p>
                  Best month ·{" "}
                  <span className="font-medium text-ink-soft">
                    {MONTH_NAMES[bestMonth.month]} · {bestMonth.count}
                  </span>
                </p>
              ) : null}
              {topVariant ? (
                <p>
                  Most often ·{" "}
                  <span className="font-medium text-ink-soft">
                    {topVariant.variant} · {topVariant.count}
                  </span>
                </p>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
