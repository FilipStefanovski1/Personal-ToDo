"use client";

import type { YearSummary } from "@/lib/stats";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

function Stat({
  label,
  value,
  suffix,
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
        <p className="mt-1.5 text-[25px] font-bold leading-none tracking-[-0.03em]">
          {value}
          {suffix ? (
            <span className="text-[15px] font-semibold text-ink-muted">{suffix}</span>
          ) : null}
        </p>
      )}
    </div>
  );
}

/**
 * The recap's opening line in numbers. Deliberately not every figure the app
 * can compute — six that together answer "how did the year go", chosen
 * editorially rather than dumped from every stats function available.
 */
export function RecapNumbers({
  summary,
  goalsReached,
  goalsJudged,
  momentsCount,
}: {
  summary: YearSummary;
  goalsReached: number;
  goalsJudged: number;
  momentsCount: number;
}) {
  const empty = summary.totalCompletions === 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Stat label="Completions" value={<AnimatedNumber value={summary.totalCompletions} />} />
      <Stat
        label="Consistency"
        value={<AnimatedNumber value={summary.consistency} />}
        suffix="%"
        placeholder={summary.hasConsistency ? undefined : "Not enough data"}
      />
      <Stat
        label="Active days"
        value={<AnimatedNumber value={summary.activeDays} />}
        placeholder={empty ? "None yet" : undefined}
      />
      <Stat
        label="Longest streak"
        value={<AnimatedNumber value={summary.longestStreak} />}
        suffix={summary.longestStreak === 1 ? " day" : " days"}
        placeholder={summary.longestStreak === 0 ? "No full day yet" : undefined}
      />
      <Stat
        label="Goals reached"
        value={<AnimatedNumber value={goalsReached} />}
        suffix={goalsJudged > 0 ? ` of ${goalsJudged}` : undefined}
        placeholder={goalsJudged === 0 ? "No goals set" : undefined}
      />
      <Stat
        label="Moments"
        value={<AnimatedNumber value={momentsCount} />}
        placeholder={momentsCount === 0 ? "None marked" : undefined}
      />
    </div>
  );
}
