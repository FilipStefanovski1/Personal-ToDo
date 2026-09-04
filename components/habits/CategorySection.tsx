"use client";

import type { Category, DateKey, Habit } from "@/types";
import { progressLabel, type CategoryProgress } from "@/lib/categories";
import { weeklyProgress } from "@/lib/schedule";
import { HabitCheckRow } from "./HabitCheckRow";
import { VariantPicker } from "./VariantPicker";

/**
 * One category on the Today screen: an understated header with derived
 * progress, then its items.
 *
 * Deliberately not a card — hierarchy comes from typography, spacing and a
 * hairline rule, so a day with five categories doesn't turn into five heavy
 * boxes stacked down the page.
 */
export function CategorySection({
  category,
  progress,
  habits,
  date,
  completedIds,
  isCompleted,
  onToggle,
  weekStartsOn,
  isFirst,
  variantOn,
  onSelectVariant,
}: {
  category: Category;
  progress: CategoryProgress;
  habits: Habit[];
  date: DateKey;
  completedIds: Set<string>;
  isCompleted: (habitId: string, date: DateKey) => boolean;
  onToggle: (habitId: string) => void;
  weekStartsOn: 0 | 1;
  isFirst: boolean;
  variantOn: (habitId: string, date: DateKey) => string | null;
  onSelectVariant: (habitId: string, variant: string | null) => void;
}) {
  if (habits.length === 0) return null;

  return (
    <section className={isFirst ? "" : "border-t border-line pt-5"}>
      <header className="mb-2.5 flex items-baseline justify-between gap-3 px-0.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          {category.name}
        </h3>
        <p
          className={[
            "shrink-0 text-[12px] font-medium tabular",
            progress.goalMet ? "text-ink" : "text-ink-muted",
          ].join(" ")}
        >
          {progressLabel(category, progress)}
          {progress.goalMet ? <span aria-hidden> ✓</span> : null}
        </p>
      </header>

      <div className="space-y-2">
        {habits.map((habit) => {
          const meta =
            habit.schedule.type === "timesPerWeek"
              ? `${weeklyProgress(habit, date, isCompleted, weekStartsOn)} of ${
                  habit.schedule.timesPerWeek
                } this week`
              : undefined;

          const completed = completedIds.has(habit.id);
          return (
            <div key={habit.id}>
              <HabitCheckRow
                habit={habit}
                date={date}
                completed={completed}
                onToggle={() => onToggle(habit.id)}
                meta={meta}
              />
              {/* Only after it's done — the tap is never gated on a choice. */}
              {completed && habit.variants?.length ? (
                <VariantPicker
                  variants={habit.variants}
                  selected={variantOn(habit.id, date)}
                  color={habit.color}
                  onSelect={(variant) => onSelectVariant(habit.id, variant)}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
