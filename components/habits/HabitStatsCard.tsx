"use client";

import type { Habit, HabitStats } from "@/types";
import { withAlpha } from "@/lib/colors";
import { describeSchedule } from "@/lib/schedule";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

function Figure({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </p>
      <p className="mt-1 text-[17px] font-bold leading-none tracking-[-0.02em]">{value}</p>
    </div>
  );
}

/** Per-habit numbers. Deliberately quiet — the grid is the hero, not this. */
export function HabitStatsCard({ habit, stats }: { habit: Habit; stats: HabitStats }) {
  const unit = stats.streakUnit === "weeks" ? "w" : "d";

  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-lg text-[15px]"
          style={{ background: withAlpha(habit.color, 0.16) }}
        >
          {habit.emoji}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold tracking-tight">{habit.name}</p>
          <p className="truncate text-[11.5px] text-ink-muted">
            {describeSchedule(habit.schedule)}
          </p>
        </div>
      </div>

      {stats.totalCompleted === 0 ? (
        <p className="mt-4 text-[12.5px] leading-relaxed text-ink-muted">
          No completions yet.
        </p>
      ) : (
        <>
      <div className="mt-4 grid grid-cols-4 gap-2">
        <Figure
          label="Streak"
          value={
            <>
              <AnimatedNumber value={stats.currentStreak} />
              <span className="text-[12px] font-semibold text-ink-muted">{unit}</span>
            </>
          }
        />
        <Figure
          label="Longest"
          value={
            <>
              <AnimatedNumber value={stats.longestStreak} />
              <span className="text-[12px] font-semibold text-ink-muted">{unit}</span>
            </>
          }
        />
        <Figure label="Month" value={<AnimatedNumber value={stats.completedThisMonth} />} />
        <Figure
          label="Year"
          value={
            stats.hasRate ? (
              <>
                <AnimatedNumber value={stats.completionRate} />
                <span className="text-[12px] font-semibold text-ink-muted">%</span>
              </>
            ) : (
              <span className="text-[15px] font-semibold text-ink-muted">—</span>
            )
          }
        />
      </div>

      {stats.hasRate ? (
        <div
          className="mt-3.5 h-1.5 overflow-hidden rounded-full"
          style={{ background: withAlpha(habit.color, 0.16) }}
          aria-hidden
        >
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${stats.completionRate}%`, background: habit.color }}
          />
        </div>
      ) : null}
        </>
      )}
    </div>
  );
}
