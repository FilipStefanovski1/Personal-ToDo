"use client";

import type { Category, Habit } from "@/types";
import type { GoalsByResult } from "@/lib/recap";
import { goalColor, goalLabel, goalSourceExists } from "@/lib/goals";
import { DEFAULT_COLOR } from "@/lib/colors";
import { GoalRow } from "@/components/goals/GoalRow";
import { Card, SectionLabel } from "@/components/ui/Card";

/**
 * A goal's yearly conclusion, grouped by what actually happened — reached,
 * still open, or the period closed short. No group is called a failure; an
 * ended goal is a result, exactly as much a part of the year as a reached one.
 */
export function RecapGoals({
  goals,
  habits,
  categories,
}: {
  goals: GoalsByResult;
  habits: Habit[];
  categories: Category[];
}) {
  if (goals.reached.length + goals.inProgress.length + goals.ended.length === 0) return null;

  const groups = [
    { title: "Reached", entries: goals.reached },
    { title: "Still in progress", entries: goals.inProgress },
    { title: "Results", entries: goals.ended },
  ].filter((g) => g.entries.length > 0);

  return (
    <section className="space-y-4">
      <SectionLabel>Goals</SectionLabel>
      {groups.map((group) => (
        <div key={group.title} className="space-y-2">
          <p className="px-1 text-[12px] font-medium text-ink-muted">{group.title}</p>
          <Card className="divide-y divide-line overflow-hidden">
            {group.entries.map((progress) => (
              <GoalRow
                key={progress.goal.id}
                progress={progress}
                label={goalLabel(progress.goal, habits, categories)}
                color={goalColor(progress.goal.source, habits, DEFAULT_COLOR)}
                detached={!goalSourceExists(progress.goal, habits, categories)}
              />
            ))}
          </Card>
        </div>
      ))}
    </section>
  );
}
