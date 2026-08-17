"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  MONTH_NAMES,
  daysInMonthKeys,
  formatLongDate,
  isToday,
  todayKey,
} from "@/lib/dates";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { DayChecklist } from "@/components/habits/DayChecklist";
import { Card, SectionLabel } from "@/components/ui/Card";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export default function MonthPage() {
  const { ready, completionsOn } = useStore();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState(() => todayKey());

  const monthTotal = useMemo(() => {
    if (!ready) return 0;
    return daysInMonthKeys(cursor.year, cursor.month).reduce(
      (sum, date) => sum + completionsOn(date).length,
      0,
    );
  }, [ready, cursor, completionsOn]);

  if (!ready) return <PageSkeleton />;

  const atCurrentMonth =
    cursor.year === now.getFullYear() && cursor.month === now.getMonth();

  const step = (delta: number) => {
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      if (next > new Date(now.getFullYear(), now.getMonth(), 1)) return { year, month };
      return { year: next.getFullYear(), month: next.getMonth() };
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
          <p className="mr-2 text-[12.5px] tabular text-ink-muted">
            {monthTotal} completion{monthTotal === 1 ? "" : "s"}
          </p>
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

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
        <Card className="p-4 md:p-5">
          <MonthGrid
            year={cursor.year}
            month={cursor.month}
            selected={selected}
            onSelect={setSelected}
          />
        </Card>

        <Card className="p-5 lg:sticky lg:top-24">
          <div className="mb-4">
            <SectionLabel>{isToday(selected) ? "Today" : "Selected day"}</SectionLabel>
            <p className="mt-1.5 text-[19px] font-bold tracking-[-0.02em]">
              {formatLongDate(selected)}
            </p>
          </div>
          <DayChecklist date={selected} />
        </Card>
      </div>
    </div>
  );
}
