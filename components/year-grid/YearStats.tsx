"use client";

import type { YearSummary } from "@/lib/stats";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: React.ReactNode;
  suffix?: string;
}) {
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3.5">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </p>
      <p className="mt-1.5 text-[26px] font-bold leading-none tracking-[-0.03em]">
        {value}
        {suffix ? <span className="text-[16px] font-semibold text-ink-muted">{suffix}</span> : null}
      </p>
    </div>
  );
}

/** The four headline numbers above the year grid. */
export function YearStats({ summary }: { summary: YearSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Completions" value={<AnimatedNumber value={summary.totalCompletions} />} />
      <Stat label="Consistency" value={<AnimatedNumber value={summary.consistency} />} suffix="%" />
      <Stat
        label="Current streak"
        value={<AnimatedNumber value={summary.overallStreak} />}
        suffix={summary.overallStreak === 1 ? " day" : " days"}
      />
      <Stat
        label="Best month"
        value={
          <span className="text-[22px]">{summary.bestMonth ?? "—"}</span>
        }
      />
    </div>
  );
}
