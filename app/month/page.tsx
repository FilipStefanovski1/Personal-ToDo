"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  MONTH_NAMES,
  formatLongDate,
  isToday,
  todayKey,
} from "@/lib/dates";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { MonthSummary } from "@/components/calendar/MonthSummary";
import { MonthJournal } from "@/components/calendar/MonthJournal";
import { computeMonthSummary } from "@/lib/stats";
import { LG_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import { DaySheet } from "@/components/habits/DaySheet";
import { DayChecklist } from "@/components/habits/DayChecklist";
import { Card, SectionLabel } from "@/components/ui/Card";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export default function MonthPage() {
  const { ready, activeCategories, activeHabits, data, sickDaySet } = useStore();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState(() => todayKey());
  const [openDay, setOpenDay] = useState<string | null>(null);

  // The side panel only exists at lg. Below it, picking a day has to open the
  // sheet — otherwise tapping a note silently updates a panel a thousand
  // pixels up the page and nothing appears to happen.
  const hasSidePanel = useMediaQuery(LG_QUERY);

  const summary = useMemo(
    () =>
      computeMonthSummary(
        activeCategories,
        activeHabits,
        data.completions,
        data.notes,
        sickDaySet,
        cursor.year,
        cursor.month,
      ),
    [activeCategories, activeHabits, data.completions, data.notes, sickDaySet, cursor],
  );

  const selectDay = useCallback(
    (date: string) => {
      setSelected(date);
      if (!hasSidePanel) setOpenDay(date);
    },
    [hasSidePanel],
  );

  const closeDay = useCallback(() => setOpenDay(null), []);

  if (!ready) return <PageSkeleton />;

  const atCurrentMonth =
    cursor.year === now.getFullYear() && cursor.month === now.getMonth();

  const step = (delta: number) => {
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      if (next > new Date(now.getFullYear(), now.getMonth(), 1)) return { year, month };

      // Carry the selected day across with it, so the panel keeps showing a
      // day from the month you're actually looking at. Same day-of-month
      // where it exists, clamped to the month's length and never the future.
      const nextYear = next.getFullYear();
      const nextMonth = next.getMonth();
      setSelected((current) => {
        const day = Number(current.slice(8, 10));
        const lastDay = new Date(nextYear, nextMonth + 1, 0).getDate();
        const isCurrentMonth =
          nextYear === now.getFullYear() && nextMonth === now.getMonth();
        const cap = isCurrentMonth ? now.getDate() : lastDay;
        const target = Math.min(day, cap);
        return `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(target).padStart(2, "0")}`;
      });

      return { year: nextYear, month: nextMonth };
    });
  };

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
            {cursor.year}
          </p>
          <h1 className="mt-1 text-[34px] font-bold leading-none tracking-[-0.03em] md:text-[42px]">
            {MONTH_NAMES[cursor.month]}
          </h1>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous month"
            className="grid size-9 place-items-center rounded-full border border-line bg-surface text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={atCurrentMonth}
            aria-label="Next month"
            className="grid size-9 place-items-center rounded-full border border-line bg-surface text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:pointer-events-none disabled:opacity-35"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </header>

      <MonthSummary summary={summary} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
        <Card className="p-4 md:p-5">
          <MonthGrid
            year={cursor.year}
            month={cursor.month}
            selected={selected}
            onSelect={selectDay}
          />
        </Card>

        <Card className="hidden p-5 lg:sticky lg:top-24 lg:block">
          <div className="mb-4">
            <SectionLabel>{isToday(selected) ? "Today" : "Selected day"}</SectionLabel>
            <p className="mt-1.5 text-[19px] font-bold tracking-[-0.02em]">
              {formatLongDate(selected)}
            </p>
          </div>
          <DayChecklist date={selected} />
        </Card>
      </div>

      <MonthJournal year={cursor.year} month={cursor.month} onSelectDay={selectDay} />

      <DaySheet date={openDay} onClose={closeDay} onNavigate={setOpenDay} />
    </div>
  );
}
