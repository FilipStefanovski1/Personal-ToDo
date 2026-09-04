"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { DateKey, Habit } from "@/types";
import { useStore } from "@/lib/store";
import { isHabitDueOn } from "@/lib/schedule";
import { categoryProgress, groupByCategory } from "@/lib/categories";
import { isFuture, isToday } from "@/lib/dates";
import { HabitCheckRow } from "./HabitCheckRow";
import { CategorySection } from "./CategorySection";
import { DayProgress } from "./DayProgress";
import { SickDayToggle } from "./SickDayToggle";
import { DayNote } from "./DayNote";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

/**
 * The checklist for a single date, grouped by category. Shared by the Today
 * screen and the Month view's day panel so editing a past day behaves exactly
 * like editing today.
 */
export function DayChecklist({
  date,
  showProgress = true,
  sickToggleVariant = "floating",
}: {
  date: DateKey;
  showProgress?: boolean;
  /** Inline inside the day sheet, floating on full pages. */
  sickToggleVariant?: "floating" | "inline";
}) {
  const {
    activeCategories,
    activeHabits,
    isCompleted,
    toggleCompletion,
    completionsOn,
    settings,
    isSickDay,
    toggleSickDay,
    noteOn,
    setNote,
  } = useStore();

  const completedIds = useMemo(() => new Set(completionsOn(date)), [completionsOn, date]);
  const byCategory = useMemo(() => groupByCategory(activeHabits), [activeHabits]);
  const sick = isSickDay(date);

  /**
   * Categories that have something scheduled today, with derived progress.
   * On a sick day every category is excused, so `due` is forced empty and
   * every section drops out of this list.
   */
  const sections = useMemo(
    () =>
      activeCategories
        .map((category) => {
          const all = byCategory.get(category.id) ?? [];
          const due = sick ? [] : all.filter((h) => isHabitDueOn(h, date));
          return {
            category,
            due,
            progress: categoryProgress(category, all, date, isCompleted, sick),
          };
        })
        .filter((section) => section.due.length > 0),
    [activeCategories, byCategory, date, isCompleted, sick],
  );

  /**
   * Anything not due today — on an ordinary day that's whatever isn't
   * scheduled; on a sick day it's everything, so nothing disappears, it just
   * moves into the optional "log anyway" list below.
   */
  const notDue = useMemo(
    () => (sick ? activeHabits : activeHabits.filter((h) => !isHabitDueOn(h, date))),
    [activeHabits, date, sick],
  );

  const allDue = useMemo(() => sections.flatMap((s) => s.due), [sections]);
  const locked = isFuture(date);

  if (activeHabits.length === 0) {
    return (
      <EmptyState
        title="No habits yet"
        description="Create a category, add a few items, and the year grid starts filling in from today."
        action={
          <Link href="/habits">
            <Button variant="primary">Set up your habits</Button>
          </Link>
        }
      />
    );
  }

  if (locked) {
    return (
      <EmptyState
        title="That day hasn't happened yet"
        description="You can only check things off on today or in the past."
      />
    );
  }

  return (
    <div className="space-y-5">
      <SickDayToggle
        active={sick}
        onToggle={() => toggleSickDay(date)}
        variant={sickToggleVariant}
      />

      {sick ? (
        <p className="text-[12.5px] leading-relaxed text-ink-muted">
          Nothing is required today — this day won&rsquo;t count against any streak or
          average. Still want to log something anyway? Open the list below.
        </p>
      ) : (
        <>
          {showProgress ? (
            <DayProgress
              due={allDue}
              completedIds={completedIds}
              isToday={isToday(date)}
              goalsMet={sections.filter((s) => s.progress.goalMet).length}
              goalsTotal={sections.length}
            />
          ) : null}

          {sections.map((section, index) => (
            <CategorySection
              key={section.category.id}
              category={section.category}
              progress={section.progress}
              habits={section.due}
              date={date}
              completedIds={completedIds}
              isCompleted={isCompleted}
              onToggle={(habitId) => toggleCompletion(habitId, date)}
              weekStartsOn={settings.weekStartsOn}
              isFirst={index === 0 && !showProgress}
            />
          ))}
        </>
      )}

      <DayNote value={noteOn(date)} onSave={(text) => setNote(date, text)} />

      {notDue.length > 0 ? (
        <details className="group border-t border-line pt-4">
          <summary className="cursor-pointer list-none text-[12.5px] font-medium text-ink-muted transition-colors hover:text-ink">
            {sick ? "Log something anyway" : `${notDue.length} not scheduled today`}
            <span className="ml-1 inline-block transition-transform group-open:rotate-90">›</span>
          </summary>
          <div className="mt-2.5 space-y-2 opacity-65">
            {notDue.map((habit: Habit) => (
              <HabitCheckRow
                key={habit.id}
                habit={habit}
                date={date}
                completed={completedIds.has(habit.id)}
                onToggle={() => toggleCompletion(habit.id, date)}
              />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
