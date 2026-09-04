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
  const { ready, categories, activeCategories, habits, activeHabits, data, settings, sickDaySet } =
    useStore();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [mode, setMode] = useState<Mode>("byHabit");
  const [detail, setDetail] = useState<Detail>("categories");
  const [openDay, setOpenDay] = useState<string | null>(null);

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

  const habitStats = useMemo(() => {
    const lookup = makeCompletionLookup(data.completions);
    return shownHabits.map((habit) => ({
      habit,
      stats: computeHabitStats(habit, data.completions, settings.weekStartsOn, sickDaySet, lookup),
    }));
  }, [shownHabits, data.completions, settings.weekStartsOn, sickDaySet]);

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
