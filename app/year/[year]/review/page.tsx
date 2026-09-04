"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { computeYearRecords, computeYearSummary, makeCompletionLookup } from "@/lib/stats";
import { collectYearHighlights, computeGoalProgress } from "@/lib/goals";
import {
  avgCompletionsPerActiveDay,
  computeMonthlyBreakdown,
  goalsByResult,
  habitStories,
  halfYearConsistency,
  notesInYear,
  strongestMonth,
  weekdayPattern,
} from "@/lib/recap";
import { DEFAULT_COLOR } from "@/lib/colors";
import { todayKey } from "@/lib/dates";
import { RecapNumbers } from "@/components/recap/RecapNumbers";
import { MonthRhythmStrip } from "@/components/recap/MonthRhythmStrip";
import { StrongestMonthCard } from "@/components/recap/StrongestMonthCard";
import { RecapRecords } from "@/components/recap/RecapRecords";
import { RecapGoals } from "@/components/recap/RecapGoals";
import { RecapHighlights } from "@/components/recap/RecapHighlights";
import { HabitStories } from "@/components/recap/HabitStories";
import { RecapPatterns } from "@/components/recap/RecapPatterns";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Button } from "@/components/ui/Button";

export default function YearReviewPage() {
  const params = useParams<{ year: string }>();
  const router = useRouter();
  const { ready, categories, activeCategories, habits, activeHabits, data, settings, sickDaySet, goals, moments } =
    useStore();

  const year = Number(params.year);
  const currentYear = new Date().getFullYear();
  const isCurrentYear = year === currentYear;
  const today = isCurrentYear ? todayKey() : `${year}-12-31`;

  const shownCategories = settings.showArchived ? categories : activeCategories;
  const shownHabits = useMemo(() => {
    const visible = new Set(shownCategories.map((c) => c.id));
    return (settings.showArchived ? habits : activeHabits).filter((h) => visible.has(h.categoryId));
  }, [habits, activeHabits, shownCategories, settings.showArchived]);

  const summary = useMemo(
    () => computeYearSummary(shownCategories, shownHabits, data.completions, year, sickDaySet),
    [shownCategories, shownHabits, data.completions, year, sickDaySet],
  );

  const yearGoalProgress = useMemo(
    () =>
      goals
        .map((goal) => computeGoalProgress(goal, data.completions, habits, today))
        .filter((p) => p.from.startsWith(String(year))),
    [goals, data.completions, habits, today, year],
  );

  const breakdown = useMemo(
    () =>
      computeMonthlyBreakdown(
        shownCategories,
        shownHabits,
        data.completions,
        data.notes,
        moments,
        yearGoalProgress,
        year,
        sickDaySet,
        today,
      ),
    [shownCategories, shownHabits, data.completions, data.notes, moments, yearGoalProgress, year, sickDaySet, today],
  );

  const records = useMemo(
    () => computeYearRecords(shownHabits, data.completions, year, settings.weekStartsOn),
    [shownHabits, data.completions, year, settings.weekStartsOn],
  );

  const strongest = useMemo(() => strongestMonth(breakdown), [breakdown]);

  const weekdays = useMemo(
    () => weekdayPattern(shownHabits, data.completions, year, today),
    [shownHabits, data.completions, year, today],
  );

  // A first-half-vs-second-half read is only fair once the year is over —
  // mid-year, the second half is a few elapsed weeks against a full six
  // months, and the comparison would just be measuring how little of it has
  // happened yet.
  const halfYear = useMemo(
    () =>
      isCurrentYear
        ? { first: null, second: null }
        : halfYearConsistency(shownCategories, shownHabits, data.completions, year, sickDaySet, today),
    [isCurrentYear, shownCategories, shownHabits, data.completions, year, sickDaySet, today],
  );

  const avgPerActiveDay = useMemo(() => avgCompletionsPerActiveDay(summary), [summary]);

  const noteCount = useMemo(() => notesInYear(data.notes, year).length, [data.notes, year]);

  const goalsResult = useMemo(() => goalsByResult(yearGoalProgress), [yearGoalProgress]);

  const highlights = useMemo(
    () => collectYearHighlights(year, yearGoalProgress, moments, habits, categories, DEFAULT_COLOR),
    [year, yearGoalProgress, moments, habits, categories],
  );

  const momentsThisYear = useMemo(
    () => moments.filter((m) => m.date.startsWith(String(year))).length,
    [moments, year],
  );

  const stories = useMemo(
    () => habitStories(shownHabits, data.completions, data.variants, year),
    [shownHabits, data.completions, data.variants, year],
  );

  if (!ready) return <PageSkeleton />;

  if (!Number.isInteger(year) || year < 2000 || year > currentYear + 1) {
    return (
      <div className="animate-rise">
        <EmptyState
          title="Not a year this app knows about"
          description="Pick a year from the Year page to see its review."
          action={
            <Link href="/year">
              <Button variant="primary">Back to Year</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (year > currentYear) {
    return (
      <div className="animate-rise">
        <EmptyState
          title={`${year} hasn't started yet`}
          description="Come back once the year is under way — there'll be a review waiting."
          action={
            <Link href="/year">
              <Button variant="primary">Back to Year</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (shownHabits.length === 0) {
    return (
      <div className="animate-rise">
        <EmptyState
          title="Nothing to review yet"
          description="Once you have a habit and a bit of history, this page fills in with the shape of your year."
          action={
            <Link href="/habits">
              <Button variant="primary">Set up your habits</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="animate-rise space-y-8 pb-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/year"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} /> Year
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => router.push(`/year/${year - 1}/review`)}
            aria-label="Previous year"
            className="grid size-8 place-items-center rounded-full text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => router.push(`/year/${year + 1}/review`)}
            disabled={year >= currentYear}
            aria-label="Next year"
            className="grid size-8 place-items-center rounded-full text-ink-muted transition-colors hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <header>
        <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
          {isCurrentYear ? "Year so far" : "Your year"}
        </p>
        <h1 className="mt-1 text-[44px] font-bold leading-none tracking-[-0.03em] tabular md:text-[58px]">
          {year}
        </h1>
      </header>

      <RecapNumbers
        summary={summary}
        goalsReached={goalsResult.reached.length}
        goalsJudged={yearGoalProgress.length}
        momentsCount={momentsThisYear}
      />

      <section className="space-y-3">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          The shape of the year
        </p>
        <MonthRhythmStrip breakdown={breakdown} />
      </section>

      {strongest ? <StrongestMonthCard month={strongest} /> : null}

      <RecapRecords records={records} />

      <RecapGoals goals={goalsResult} habits={habits} categories={categories} />

      <RecapHighlights highlights={highlights} />

      <HabitStories stories={stories} />

      <RecapPatterns
        bestWeekday={weekdays[0] ?? null}
        halfYear={halfYear}
        avgPerActiveDay={avgPerActiveDay}
        noteCount={noteCount}
      />
    </div>
  );
}
