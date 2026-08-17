"use client";

import { useCallback, useMemo, useState } from "react";
import type { DateKey, Habit } from "@/types";
import { useStore } from "@/lib/store";
import {
  DAY_INITIALS,
  MONTH_SHORT,
  daysInYear,
  formatLongDate,
  getWeekday,
  isFuture,
  todayKey,
} from "@/lib/dates";
import { stripeBackground } from "@/lib/colors";
import { GridTooltip, type TooltipState } from "@/components/ui/Tooltip";

const CELL: Record<string, number> = { sm: 10, md: 13, lg: 17 };
const GAP = 3;

interface Column {
  /** Seven slots, weekday-ordered; null where the week runs past the year. */
  cells: (DateKey | null)[];
  /** Set only on the column that contains a 1st of the month — its label. */
  monthLabel: number | null;
}

/**
 * A calendar-shaped overview: 53 week columns × 7 weekday rows. Days with
 * several completed habits split into flat colour bands, so a full day reads
 * as a small striped tile.
 */
export function YearCombined({ year, habits }: { year: number; habits: Habit[] }) {
  const { completionsOn, settings } = useStore();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const size = CELL[settings.cellSize] ?? CELL.md;
  const today = todayKey();
  const weekStartsOn = settings.weekStartsOn;

  const habitById = useMemo(() => new Map(habits.map((h) => [h.id, h])), [habits]);

  const columns = useMemo<Column[]>(() => {
    const days = daysInYear(year);
    const result: Column[] = [];
    let current: (DateKey | null)[] = new Array(7).fill(null);
    let seenAny = false;

    for (const date of days) {
      const slot = (getWeekday(date) - weekStartsOn + 7) % 7;
      if (slot === 0 && seenAny) {
        result.push(finalize(current));
        current = new Array(7).fill(null);
      }
      current[slot] = date;
      seenAny = true;
    }
    if (seenAny) result.push(finalize(current));

    function finalize(cells: (DateKey | null)[]): Column {
      // Label the column by the month that *starts* in it, not by whichever
      // month its first cell happens to fall in — a week spanning Jan 31 and
      // Feb 1 belongs to February.
      const firstOfMonth = cells.find((c): c is DateKey => c !== null && c.endsWith("-01"));
      return {
        cells,
        monthLabel: firstOfMonth ? Number(firstOfMonth.slice(5, 7)) - 1 : null,
      };
    }

    return result;
  }, [year, weekStartsOn]);

  const colorsFor = useCallback(
    (date: DateKey) =>
      completionsOn(date)
        .map((id) => habitById.get(id))
        .filter((h): h is Habit => !!h)
        .sort((a, b) => a.order - b.order)
        .map((h) => h.color),
    [completionsOn, habitById],
  );

  const handlePointer = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-date]");
      if (!target) {
        setTooltip(null);
        return;
      }
      const date = target.dataset.date!;
      const ids = completionsOn(date);
      const names = ids
        .map((id) => habitById.get(id))
        .filter((h): h is Habit => !!h)
        .map((h) => h.name);
      const rect = target.getBoundingClientRect();
      setTooltip({
        x: rect.left + rect.width / 2,
        y: rect.top,
        title: formatLongDate(date),
        detail:
          names.length === 0
            ? "Nothing completed"
            : names.length <= 3
              ? names.join(", ")
              : `${names.slice(0, 2).join(", ")} +${names.length - 2} more`,
      });
    },
    [completionsOn, habitById],
  );

  const weekdayLabels = useMemo(
    () => Array.from({ length: 7 }, (_, i) => DAY_INITIALS[(i + weekStartsOn) % 7]),
    [weekStartsOn],
  );

  return (
    <div>
      <div
        className="tidy-scroll overflow-x-auto pb-2"
        onMouseMove={handlePointer}
        onMouseLeave={() => setTooltip(null)}
        onClick={handlePointer}
      >
        <div className="flex" style={{ gap: GAP }}>
          {/* Weekday gutter — every other label, GitHub-style, to stay uncluttered */}
          <div className="sticky left-0 z-20 shrink-0 bg-surface pr-1">
            <div style={{ height: 18 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
              {weekdayLabels.map((label, i) => (
                <div
                  key={i}
                  className="flex items-center justify-end pr-1 text-[9.5px] font-semibold text-ink-muted"
                  style={{ height: size, width: 20 }}
                >
                  {i % 2 === 0 ? label : ""}
                </div>
              ))}
            </div>
          </div>

          {columns.map((column, index) => (
            <div key={index} className="shrink-0" style={{ width: size }}>
              <div className="h-[18px] text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                {column.monthLabel !== null ? MONTH_SHORT[column.monthLabel] : ""}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                {column.cells.map((date, slot) => {
                  if (!date) {
                    return <span key={slot} style={{ width: size, height: size }} />;
                  }
                  const colors = colorsFor(date);
                  const isToday = date === today;
                  return (
                    <span
                      key={slot}
                      data-date={date}
                      className="block rounded-[3px] transition-colors duration-150"
                      style={{
                        width: size,
                        height: size,
                        background: colors.length
                          ? stripeBackground(colors)
                          : isFuture(date)
                            ? "var(--cell-empty-off)"
                            : "var(--cell-empty)",
                        boxShadow: isToday ? "0 0 0 1.5px var(--ink)" : undefined,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <GridTooltip state={tooltip} />
    </div>
  );
}
