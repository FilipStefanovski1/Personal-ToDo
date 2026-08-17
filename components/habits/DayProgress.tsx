"use client";

import type { Habit } from "@/types";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

/**
 * "5 / 7 completed · 71%" plus a segmented bar — one segment per due habit,
 * filled in that habit's own colour. It doubles as a legend for the day.
 */
export function DayProgress({
  due,
  completedIds,
  isToday = true,
  goalsMet = 0,
  goalsTotal = 0,
}: {
  due: Habit[];
  completedIds: Set<string>;
  isToday?: boolean;
  /** Categories whose goal was met — the headline for grouped days. */
  goalsMet?: number;
  goalsTotal?: number;
}) {
  const total = due.length;
  const done = due.filter((h) => completedIds.has(h.id)).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  // "Done" means every category goal is met, not every box ticked — an "any"
  // category is satisfied without completing all of its items.
  const allDone = goalsTotal > 0 && goalsMet === goalsTotal;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[14px] font-semibold tracking-tight">
          <AnimatedNumber value={done} duration={340} />
          <span className="text-ink-muted"> / {total} completed</span>
        </p>
        <p className="text-[13px] font-medium tabular text-ink-muted">
          <AnimatedNumber value={percent} duration={420} />%{isToday ? " today" : ""}
        </p>
      </div>

      <div className="mt-2.5 flex gap-1" aria-hidden>
        {due.map((habit) => {
          const isDone = completedIds.has(habit.id);
          return (
            <span
              key={habit.id}
              className="h-1.5 flex-1 rounded-full transition-all duration-300"
              style={{
                background: isDone ? habit.color : "var(--cell-empty)",
              }}
            />
          );
        })}
      </div>

      {allDone ? (
        <p className="mt-2.5 animate-rise text-[13px] font-medium text-ink-soft">
          {isToday ? "Every goal met today. 🎉" : "Every goal met. 🎉"}
        </p>
      ) : goalsTotal > 0 ? (
        <p className="mt-2.5 text-[12.5px] text-ink-muted">
          {goalsMet} of {goalsTotal} category {goalsTotal === 1 ? "goal" : "goals"} met
        </p>
      ) : null}
    </div>
  );
}
