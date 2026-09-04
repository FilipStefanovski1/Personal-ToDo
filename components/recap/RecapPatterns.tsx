"use client";

import { DAY_NAMES } from "@/lib/dates";
import type { WeekdayPattern } from "@/lib/recap";
import { Card, SectionLabel } from "@/components/ui/Card";

/**
 * A few simple, defensible patterns — never a pseudo-scientific read of them.
 * Each line states a number the app actually computed; nothing here infers a
 * mood or a reason. A line is omitted rather than shown as a shaky guess when
 * the underlying data doesn't support it yet.
 */
export function RecapPatterns({
  bestWeekday,
  halfYear,
  avgPerActiveDay,
  noteCount,
}: {
  bestWeekday: WeekdayPattern | null;
  halfYear: { first: number | null; second: number | null };
  avgPerActiveDay: number | null;
  noteCount: number;
}) {
  const lines: string[] = [];

  if (bestWeekday && bestWeekday.occurrences >= 4 && bestWeekday.activeDays > 0) {
    lines.push(
      `Most consistent day: ${DAY_NAMES[bestWeekday.weekday]}s — active ${Math.round(
        bestWeekday.rate * 100,
      )}% of the time.`,
    );
  }

  if (halfYear.first !== null && halfYear.second !== null) {
    lines.push(
      `First half of the year: ${halfYear.first}% consistency · second half: ${halfYear.second}%.`,
    );
  }

  if (avgPerActiveDay !== null) {
    lines.push(`On a day you did something, you did it ${avgPerActiveDay} times on average.`);
  }

  if (noteCount > 0) {
    lines.push(`${noteCount} ${noteCount === 1 ? "note" : "notes"} written this year.`);
  }

  if (lines.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionLabel>Patterns</SectionLabel>
      <Card className="divide-y divide-line overflow-hidden">
        {lines.map((line) => (
          <p key={line} className="px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
            {line}
          </p>
        ))}
      </Card>
    </section>
  );
}
