"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { MonthSummary as Summary } from "@/lib/stats";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3.5">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </p>
      <p className="mt-1.5 text-[24px] font-bold leading-none tracking-[-0.03em]">{value}</p>
      {detail ? <p className="mt-1.5 text-[11.5px] text-ink-muted">{detail}</p> : null}
    </div>
  );
}

/**
 * Four numbers for the month, each answering a different question: how much,
 * how often, how well, and what you actually leaned on. Nothing is shown that
 * the records don't support.
 */
export function MonthSummary({ summary }: { summary: Summary }) {
  const { completionsDelta: delta } = summary;
  const up = delta !== null && delta > 0;
  const flat = delta === 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat
        label="Completions"
        value={<AnimatedNumber value={summary.totalCompletions} />}
        detail={
          delta === null ? (
            "First month tracked"
          ) : flat ? (
            "Same as last month"
          ) : (
            <span className="inline-flex items-center gap-0.5">
              {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(delta)} vs last month
            </span>
          )
        }
      />

      <Stat
        label="Active days"
        value={<AnimatedNumber value={summary.activeDays} />}
        detail={`of ${summary.daysElapsed} so far`}
      />

      <Stat
        label="Perfect days"
        value={<AnimatedNumber value={summary.perfectDays} />}
        detail="every goal met"
      />

      <Stat
        label="Most logged"
        value={
          summary.topHabitName ? (
            <span className="text-[18px]">{summary.topHabitName}</span>
          ) : (
            <span className="text-[15px] font-semibold text-ink-muted">—</span>
          )
        }
        detail={summary.topHabitName ? `${summary.topHabitCount} times` : undefined}
      />
    </div>
  );
}
