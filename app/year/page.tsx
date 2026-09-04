"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  computeCategoryStats,
  computeHabitStats,
  computeYearSummary,
  makeCompletionLookup,
} from "@/lib/stats";
import { groupByCategory } from "@/lib/categories";
import {
  collectYearHighlights,
  computeGoalProgress,
  goalColor,
  goalLabel,
  sortGoalsForDisplay,
} from "@/lib/goals";
import { DEFAULT_COLOR } from "@/lib/colors";
import { GoalRow } from "@/components/goals/GoalRow";
import { YearTimeline } from "@/components/year-grid/YearTimeline";
import { YearByHabit } from "@/components/year-grid/YearByHabit";
import { YearCombined } from "@/components/year-grid/YearCombined";
import { YearStats } from "@/components/year-grid/YearStats";
import { HabitStatsCard } from "@/components/habits/HabitStatsCard";
import { CategoryStatsCard } from "@/components/habits/CategoryStatsCard";
import { Card, SectionLabel } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { DaySheet } from "@/components/habits/DaySheet";

type Mode = "byHabit" | "combined";
type Detail = "categories" | "items";

export default function YearPage() {
  const {
    ready,
    categories,
    activeCategories,
    habits,
    activeHabits,
    data,
    settings,
    sickDaySet,
    goals,
    activeGoals,
    moments,
  } = useStore();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [mode, setMode] = useState<Mode>("byHabit");
  const [detail, setDetail] = useState<Detail>("categories");
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [showAllHighlights, setShowAllHighlights] = useState(false);

  const closeDay = useCallback(() => setOpenDay(null), []);

  const shownCategories = useMemo(
    () => (settings.showArchived ? categories : activeCategories),
    [categories, activeCategories, settings.showArchived],
  );

  const shownHabits = useMemo(() => {
    const visible = new Set(shownCategories.map((c) => c.id));
    return (settings.showArchived ? habits : activeHabits).filter((h) =>
      visible.has(h.categoryId),
    );
  }, [habits, activeHabits, shownCategories, settings.showArchived]);

  const summary = useMemo(
    () => computeYearSummary(shownCategories, shownHabits, data.completions, year, sickDaySet),
    [shownCategories, shownHabits, data.completions, year, sickDaySet],
  );

  const byCategory = useMemo(() => groupByCategory(shownHabits), [shownHabits]);

  const categoryStats = useMemo(() => {
    const lookup = makeCompletionLookup(data.completions);
    return shownCategories
      .map((category) => ({
        category,
        habits: byCategory.get(category.id) ?? [],
        stats: computeCategoryStats(
          category,
          byCategory.get(category.id) ?? [],
          data.completions,
          sickDaySet,
          lookup,
        ),
      }))
      .filter((entry) => entry.habits.length > 0);
  }, [shownCategories, byCategory, data.completions, sickDaySet]);

  /** Every goal's progress, and the subset worth showing beside the grid. */
  const goalProgress = useMemo(
    () => goals.map((goal) => computeGoalProgress(goal, data.completions, habits)),
    [goals, data.completions, habits],
  );

  const yearGoals = useMemo(() => {
    const activeIds = new Set(activeGoals.map((g) => g.id));
    return sortGoalsForDisplay(
      goalProgress.filter(
        (p) => activeIds.has(p.goal.id) && p.from.startsWith(String(year)),
      ),
    );
  }, [goalProgress, activeGoals, year]);

  const highlights = useMemo(
    () =>
      collectYearHighlights(year, goalProgress, moments, habits, categories, DEFAULT_COLOR),
    [year, goalProgress, moments, habits, categories],
  );

  const habitStats = useMemo(() => {
    const lookup = makeCompletionLookup(data.completions);
    return shownHabits.map((habit) => ({
      habit,
      stats: computeHabitStats(
        habit,
        data.completions,
        settings.weekStartsOn,
        sickDaySet,
        lookup,
        data.variants,
      ),
    }));
  }, [shownHabits, data.completions, settings.weekStartsOn, sickDaySet, data.variants]);

  if (!ready) return <PageSkeleton />;

  const currentYear = new Date().getFullYear();

  return (
    <div className="animate-rise space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
            The whole year
          </p>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              aria-label="Previous year"
              className="grid size-8 place-items-center rounded-full text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
            >
              <ChevronLeft size={18} />
            </button>
            <h1 className="text-[38px] font-bold leading-none tracking-[-0.03em] tabular md:text-[46px]">
              {year}
            </h1>
            <button
              type="button"
              onClick={() => setYear((y) => Math.min(currentYear, y + 1))}
              disabled={year >= currentYear}
              aria-label="Next year"
              className="grid size-8 place-items-center rounded-full text-ink-muted transition-colors hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <Segmented
          ariaLabel="Year grid layout"
          value={mode}
          onChange={setMode}
          options={[
            { value: "byHabit", label: "By item" },
            { value: "combined", label: "Combined" },
          ]}
        />
      </header>

      {shownHabits.length === 0 ? (
        <EmptyState
          title="Nothing to show yet"
          description="Once you have a category with a few items, this page fills up with a year of colour."
          action={
            <Link href="/habits">
              <Button variant="primary">Set up your habits</Button>
            </Link>
          }
        />
      ) : (
        <>
          <YearStats summary={summary} />

          <Card className="overflow-hidden p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <SectionLabel>
                {mode === "byHabit" ? "One row per item" : "All items combined"}
              </SectionLabel>
              <p className="text-[12px] text-ink-muted">
                {summary.activeDays} active {summary.activeDays === 1 ? "day" : "days"}
              </p>
            </div>

            {summary.totalCompletions === 0 ? (
              <p className="mb-5 text-[12.5px] leading-relaxed text-ink-muted">
                Start tracking to build your year. Every item you complete fills in its own
                square, and the sheet grows from here.
              </p>
            ) : null}

            {mode === "byHabit" ? (
              <YearByHabit
                year={year}
                categories={shownCategories}
                habits={shownHabits}
                onSelectDay={setOpenDay}
              />
            ) : (
              <YearCombined year={year} habits={shownHabits} onSelectDay={setOpenDay} />
            )}
          </Card>

          {yearGoals.length > 0 ? (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionLabel>Goals</SectionLabel>
                <Link
                  href="/goals"
                  className="text-[12.5px] font-medium text-ink-muted transition-colors hover:text-ink"
                >
                  All goals ›
                </Link>
              </div>
              <Card className="divide-y divide-line overflow-hidden">
                {yearGoals.slice(0, 4).map((progress) => (
                  <GoalRow
                    key={progress.goal.id}
                    progress={progress}
                    label={goalLabel(progress.goal, habits, categories)}
                    color={goalColor(progress.goal.source, habits, DEFAULT_COLOR)}
                  />
                ))}
              </Card>
            </section>
          ) : null}

          {highlights.length > 0 ? (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionLabel>Highlights</SectionLabel>
                <p className="text-[12px] text-ink-muted">
                  {highlights.length} this year
                </p>
              </div>
              <YearTimeline
                highlights={showAllHighlights ? highlights : highlights.slice(0, 8)}
                onSelectDay={setOpenDay}
              />
              {highlights.length > 8 ? (
                <button
                  type="button"
                  onClick={() => setShowAllHighlights((v) => !v)}
                  className="text-[12.5px] font-medium text-ink-muted transition-colors hover:text-ink"
                >
                  {showAllHighlights
                    ? "Show fewer"
                    : `Show all ${highlights.length}`}
                </button>
              ) : null}
            </section>
          ) : null}

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionLabel>Statistics</SectionLabel>
              <Segmented
                ariaLabel="Statistics level"
                value={detail}
                onChange={setDetail}
                options={[
                  { value: "categories", label: "Categories" },
                  { value: "items", label: "Items" },
                ]}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {detail === "categories"
                ? categoryStats.map((entry) => (
                    <CategoryStatsCard
                      key={entry.category.id}
                      category={entry.category}
                      habits={entry.habits}
                      stats={entry.stats}
                    />
                  ))
                : habitStats.map(({ habit, stats }) => (
                    <HabitStatsCard key={habit.id} habit={habit} stats={stats} />
                  ))}
            </div>
          </section>
        </>
      )}

      <DaySheet date={openDay} onClose={closeDay} onNavigate={setOpenDay} />
    </div>
  );
}
