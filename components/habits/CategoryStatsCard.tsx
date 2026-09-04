"use client";

import type { Category, CategoryStats, Habit } from "@/types";
import { describeGoal } from "@/lib/categories";
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

/** Placeholder for a figure that has no meaningful value yet. */
const NoData = () => <span className="text-[15px] font-semibold text-ink-muted">—</span>;

/**
 * Category-level numbers, chosen per goal type — "perfect days" is meaningless
 * for an Activity group, and "most common activity" is meaningless for
 * Supplements, so neither is shown where it wouldn't make sense.
 */
export function CategoryStatsCard({
  category,
  habits,
  stats,
}: {
  category: Category;
  habits: Habit[];
  stats: CategoryStats;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold uppercase tracking-[0.1em]">
            {category.name}
          </p>
          <p className="truncate text-[11.5px] text-ink-muted">
            {describeGoal(category)} · {habits.length} {habits.length === 1 ? "item" : "items"}
          </p>
        </div>
        <div className="flex shrink-0 -space-x-1" aria-hidden>
          {habits.slice(0, 6).map((habit) => (
            <span
              key={habit.id}
              className="size-3 rounded-[3px] ring-2 ring-surface"
              style={{ background: habit.color }}
            />
          ))}
        </div>
      </div>

      {stats.totalCompletions === 0 ? (
        <p className="mt-4 text-[12.5px] leading-relaxed text-ink-muted">
          Your patterns will appear here over time.
        </p>
      ) : (
      <div className="mt-4 grid grid-cols-3 gap-2">
        {category.goalType === "any" ? (
          <>
            <Figure
              label="Active this month"
              value={<AnimatedNumber value={stats.goalDaysThisMonth} />}
            />
            <Figure
              label="Active this year"
              value={<AnimatedNumber value={stats.goalDaysThisYear} />}
            />
            <Figure
              label="Streak"
              value={
                // A daily streak is meaningless for a category measured per
                // week — nothing was required on any given day.
                stats.judgedDays > 0 ? (
                  <>
                    <AnimatedNumber value={stats.currentStreak} />
                    <span className="text-[12px] font-semibold text-ink-muted">d</span>
                  </>
                ) : (
                  <NoData />
                )
              }
            />
          </>
        ) : (
          <>
            <Figure
              label={category.goalType === "all" ? "Perfect days" : "Goal days"}
              value={<AnimatedNumber value={stats.goalDaysThisYear} />}
            />
            <Figure
              label="Average"
              value={
                stats.hasAverage ? (
                  <>
                    <AnimatedNumber value={stats.averageCompletion} />
                    <span className="text-[12px] font-semibold text-ink-muted">%</span>
                  </>
                ) : (
                  <NoData />
                )
              }
            />
            <Figure
              label="Streak"
              value={
                <>
                  <AnimatedNumber value={stats.currentStreak} />
                  <span className="text-[12px] font-semibold text-ink-muted">d</span>
                </>
              }
            />
          </>
        )}
      </div>
      )}

      {category.goalType === "any" && stats.topHabitName ? (
        <p className="mt-3.5 border-t border-line pt-3 text-[12px] text-ink-muted">
          Most common:{" "}
          <span className="font-semibold text-ink-soft">{stats.topHabitName}</span> ·{" "}
          {stats.topHabitCount} {stats.topHabitCount === 1 ? "day" : "days"}
        </p>
      ) : null}
    </div>
  );
}
