"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  DAY_NAMES,
  formatHeroDate,
  fromDateKey,
  isToday as isTodayKey,
  todayKey,
} from "@/lib/dates";
import { computeOverallStreak, computeWeekSummary } from "@/lib/stats";
import { computeGoalProgress, goalColor, goalLabel, nudgeLabel } from "@/lib/goals";
import { DEFAULT_COLOR } from "@/lib/colors";
import { GoalReached } from "@/components/goals/GoalReached";
import { TodayGoalNudge } from "@/components/goals/TodayGoalNudge";
import { DayChecklist } from "@/components/habits/DayChecklist";
import { RecentDaysStrip } from "@/components/habits/RecentDaysStrip";
import { WeekSummary } from "@/components/habits/WeekSummary";
import { Card, SectionLabel } from "@/components/ui/Card";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export default function TodayPage() {
  const {
    ready,
    activeCategories,
    activeHabits,
    habits,
    categories,
    data,
    settings,
    completionsOn,
    sickDaySet,
    activeGoals,
    isCompleted,
  } = useStore();
  const [selected, setSelected] = useState(() => todayKey());

  const streak = useMemo(
    () =>
      ready
        ? computeOverallStreak(data.categories, data.habits, data.completions, sickDaySet)
        : 0,
    [ready, data.categories, data.habits, data.completions, sickDaySet],
  );

  const week = useMemo(
    () =>
      computeWeekSummary(
        activeCategories,
        activeHabits,
        data.completions,
        sickDaySet,
        settings.weekStartsOn,
      ),
    [activeCategories, activeHabits, data.completions, sickDaySet, settings.weekStartsOn],
  );

  /**
   * Goals whose target was reached today. Derived, so this appears the instant
   * the tap that finished it lands and retires itself when the date rolls over.
   */
  const reachedToday = useMemo(() => {
    const today = todayKey();
    return activeGoals
      .map((goal) => computeGoalProgress(goal, data.completions, habits))
      .filter((p) => p.completedOn === today);
  }, [activeGoals, data.completions, habits]);

  /**
   * At most one goal surfaces on Today, chosen as the one a single day would
   * most change: nearly finished first, then closest to slipping off pace.
   */
  const focusGoal = useMemo(() => {
    const today = todayKey();
    const candidates = activeGoals
      .map((goal) => computeGoalProgress(goal, data.completions, habits))
      .filter((p) => p.status === "active");

    const nearlyDone = candidates
      .filter((p) => p.target - p.current > 0 && p.target - p.current <= 3)
      .sort((a, b) => a.target - a.current - (b.target - b.current))[0];
    if (nearlyDone) return nearlyDone;

    const fixableToday = candidates
      .filter((p) => nudgeLabel(p) !== null)
      .sort((a, b) => (a.paceDelta ?? 0) - (b.paceDelta ?? 0))[0];
    if (!fixableToday) return null;

    // Whether the thing behind this goal was already done today, so the copy
    // can congratulate rather than ask twice.
    const source = fixableToday.goal.source;
    const doneToday =
      source.type === "habit"
        ? isCompleted(source.habitId, today)
        : habits.some((h) => h.categoryId === source.categoryId && isCompleted(h.id, today));

    return Object.assign(fixableToday, { doneToday });
  }, [activeGoals, data.completions, habits, isCompleted]);

  const yearCount = useMemo(() => {
    const year = String(new Date().getFullYear());
    let total = 0;
    for (const [date, ids] of Object.entries(data.completions)) {
      if (date.startsWith(year)) total += ids.length;
    }
    return total;
  }, [data.completions]);

  if (!ready) return <PageSkeleton />;

  const date = fromDateKey(selected);
  const viewingToday = isTodayKey(selected);
  const doneToday = completionsOn(selected).length;

  return (
    <div className="animate-rise space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
            {DAY_NAMES[date.getDay()]}
          </p>
          <h1 className="mt-1 text-[38px] font-bold uppercase leading-[0.95] tracking-[-0.03em] md:text-[52px]">
            {formatHeroDate(selected)}
          </h1>
        </div>

        {streak > 0 ? (
          <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2">
            <Flame size={15} className="text-[#F97316]" strokeWidth={2.2} />
            <span className="text-[13px] font-semibold tabular">
              <AnimatedNumber value={streak} /> day{streak === 1 ? "" : "s"}
            </span>
            <span className="text-[13px] text-ink-muted">streak</span>
          </div>
        ) : null}
      </header>

      {activeHabits.length > 0 ? (
        <RecentDaysStrip selected={selected} onSelect={setSelected} />
      ) : null}

      <Card className="p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <SectionLabel>
            {viewingToday ? "Today's habits" : `${DAY_NAMES[date.getDay()]}'s habits`}
          </SectionLabel>
          {!viewingToday ? (
            <button
              type="button"
              onClick={() => setSelected(todayKey())}
              className="text-[12.5px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              Back to today
            </button>
          ) : null}
        </div>

        <DayChecklist date={selected} />
      </Card>

      {activeHabits.length > 0 ? (
        <WeekSummary summary={week} onSelectDay={setSelected} />
      ) : null}

      {reachedToday.map((progress) => (
        <GoalReached
          key={progress.goal.id}
          progress={progress}
          label={goalLabel(progress.goal, habits, categories)}
          color={goalColor(progress.goal.source, habits, DEFAULT_COLOR)}
        />
      ))}

      {focusGoal ? (
        <TodayGoalNudge
          progress={focusGoal}
          label={goalLabel(focusGoal.goal, habits, categories)}
          color={goalColor(focusGoal.goal.source, habits, DEFAULT_COLOR)}
          doneToday={(focusGoal as { doneToday?: boolean }).doneToday ?? false}
        />
      ) : null}

      {activeHabits.length > 0 ? (
        <Link
          href="/year"
          className="group flex items-center justify-between gap-4 rounded-card border border-line bg-surface px-5 py-4 transition-all duration-200 hover:border-line-strong"
        >
          <div>
            <p className="text-[13.5px] font-semibold tracking-tight">Your year so far</p>
            <p className="mt-0.5 text-[12.5px] text-ink-muted">
              {yearCount === 0 ? (
                "Nothing recorded yet — your first square is one tap away"
              ) : (
                <>
                  <AnimatedNumber value={yearCount} />{" "}
                  {yearCount === 1 ? "completion" : "completions"}
                  {doneToday > 0 ? ` · ${doneToday} today` : ""}
                </>
              )}
            </p>
          </div>
          <ArrowRight
            size={18}
            className="shrink-0 text-ink-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink"
          />
        </Link>
      ) : null}
    </div>
  );
}
