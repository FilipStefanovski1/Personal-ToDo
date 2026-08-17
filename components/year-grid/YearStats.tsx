"use client";

import type { YearSummary } from "@/lib/stats";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

function Stat({
  label,
  value,
  suffix,
  /** Shown instead of the value when there isn't enough real data yet. */
  placeholder,
}: {
  label: string;
  value?: React.ReactNode;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3.5">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </p>
      {placeholder ? (
        <p className="mt-1.5 text-[13px] font-medium leading-snug text-ink-muted">{placeholder}</p>
      ) : (
        <p className="mt-1.5 text-[26px] font-bold leading-none tracking-[-0.03em]">
          {value}
          {suffix ? (
            <span className="text-[16px] font-semibold text-ink-muted">{suffix}</span>
          ) : null}
        </p>
      )}
    </div>
  );
}

/**
 * The four headline numbers above the year grid.
 *
 * Every figure comes from stored completion records. Where there isn't enough
 * real data for a number to mean anything, this shows a short line of text
 * rather than a confident-looking zero.
 */
export function YearStats({ summary }: { summary: YearSummary }) {
  const empty = summary.totalCompletions === 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Completions" value={<AnimatedNumber value={summary.totalCompletions} />} />

      <Stat
        label="Consistency"
        value={<AnimatedNumber value={summary.consistency} />}
        suffix="%"
        placeholder={summary.hasConsistency ? undefined : "Not enough data yet"}
      />

      <Stat
        label="Current streak"
        value={<AnimatedNumber value={summary.overallStreak} />}
        suffix={summary.overallStreak === 1 ? " day" : " days"}
        placeholder={empty ? "Start tracking to begin" : undefined}
      />

      <Stat
        label="Best month"
        value={<span className="text-[22px]">{summary.bestMonth}</span>}
        placeholder={summary.bestMonth ? undefined : "Appears once you have a few months"}
      />
    </div>
  );
}
