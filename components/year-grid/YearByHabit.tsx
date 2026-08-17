"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Category, DateKey, Habit } from "@/types";
import { useStore } from "@/lib/store";
import { MONTH_SHORT, daysInYear, formatLongDate, isFuture, todayKey } from "@/lib/dates";
import { isScheduledDay } from "@/lib/schedule";
import { groupByCategory } from "@/lib/categories";
import { GridTooltip, type TooltipState } from "@/components/ui/Tooltip";
import { CELL_GAP, ROW_GAP, dayOfYearIndex, gridMetrics, monthBands, trackWidth } from "./geometry";

/**
 * Label gutter width, as a CSS variable so it can shrink on phones without a
 * JS measurement — the track width is derived from it with `calc`.
 */
const LABEL_VAR = "[--label-w:104px] md:[--label-w:150px]";

/** Height of a category heading row, matched in both columns so rows align. */
const HEADING_HEIGHT = 16;
const HEADING_GAP = 10;

type GridRow =
  | { kind: "heading"; key: string; category: Category }
  | { kind: "habit"; key: string; habit: Habit };

/**
 * The signature view: one row of 365 cells per individual item, grouped under
 * understated category headings. Reading down a column tells you what a day
 * looked like; reading across a row tells you how a single thing went all year.
 *
 * ~3,000 cells means no per-cell React handlers — hover and tap are resolved
 * by delegation from the track using `data-` attributes.
 */
export function YearByHabit({
  year,
  categories,
  habits,
}: {
  year: number;
  categories: Category[];
  habits: Habit[];
}) {
  const { completionsOn, settings, toggleCollapsed } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const days = useMemo(() => daysInYear(year), [year]);
  const metrics = gridMetrics(settings.cellSize);
  const width = trackWidth(metrics.columnPitch, days.length);
  const bands = useMemo(() => monthBands(year, metrics.columnPitch), [year, metrics.columnPitch]);

  const today = todayKey();
  const todayIndex = today.startsWith(String(year)) ? dayOfYearIndex(today) : -1;

  const byCategory = useMemo(() => groupByCategory(habits), [habits]);

  /** Flattened render order: heading, its items, next heading, … */
  const rows = useMemo<GridRow[]>(() => {
    const out: GridRow[] = [];
    for (const category of categories) {
      const items = byCategory.get(category.id) ?? [];
      if (items.length === 0) continue;
      out.push({ kind: "heading", key: `c_${category.id}`, category });
      if (category.collapsed) continue;
      for (const habit of items) out.push({ kind: "habit", key: habit.id, habit });
    }
    return out;
  }, [categories, byCategory]);

  /** habitId -> Set of completed dates in this year. */
  const completedByHabit = useMemo(() => {
    const map = new Map<string, Set<DateKey>>();
    for (const habit of habits) map.set(habit.id, new Set());
    for (const date of days) {
      for (const habitId of completionsOn(date)) map.get(habitId)?.add(date);
    }
    return map;
  }, [habits, days, completionsOn]);

  // Open on the current month rather than January — that's where you are.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node || todayIndex < 0) return;
    const overflow = node.scrollWidth - node.clientWidth;
    if (overflow <= 0) return;
    node.scrollLeft = Math.max(
      0,
      Math.min(overflow, bands[Number(today.slice(5, 7)) - 1].left - 40),
    );
  }, [todayIndex, bands, today, metrics.columnPitch]);

  const handlePointer = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-date]");
      if (!target) {
        setTooltip(null);
        return;
      }
      const date = target.dataset.date!;
      const habit = habits.find((h) => h.id === target.dataset.habit);
      if (!habit) return;
      const done = completedByHabit.get(habit.id)?.has(date) ?? false;
      const rect = target.getBoundingClientRect();
      setTooltip({
        x: rect.left + rect.width / 2,
        y: rect.top,
        title: formatLongDate(date),
        detail: `${habit.name} ${done ? "completed" : "not completed"}`,
        color: done ? habit.color : undefined,
      });
    },
    [habits, completedByHabit],
  );

  if (rows.length === 0) return null;

  /** Top spacing above a heading, so groups read as groups. */
  const headingOffset = (index: number) => (index === 0 ? 0 : HEADING_GAP);

  return (
    <div>
      <div
        ref={scrollRef}
        className="tidy-scroll overflow-x-auto pb-2"
        onMouseMove={handlePointer}
        onMouseLeave={() => setTooltip(null)}
        onClick={handlePointer}
      >
        <div className={`flex ${LABEL_VAR}`} style={{ width: `calc(var(--label-w) + ${width}px)` }}>
          {/* Sticky labels — they stay put while the year scrolls past. */}
          <div
            className="sticky left-0 z-20 shrink-0 bg-surface pr-3"
            style={{ width: "var(--label-w)" }}
          >
            <div className="h-5" />
            <div style={{ display: "flex", flexDirection: "column", gap: ROW_GAP }}>
              {rows.map((row, index) =>
                row.kind === "heading" ? (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => toggleCollapsed(row.category.id)}
                    aria-expanded={!row.category.collapsed}
                    className="group flex items-center gap-1 overflow-hidden text-left"
                    style={{ height: HEADING_HEIGHT, marginTop: headingOffset(index) }}
                  >
                    <ChevronDown
                      size={11}
                      strokeWidth={2.8}
                      className={[
                        "shrink-0 text-ink-muted transition-transform duration-150",
                        row.category.collapsed ? "-rotate-90" : "",
                      ].join(" ")}
                    />
                    <span className="truncate text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted transition-colors group-hover:text-ink">
                      {row.category.name}
                    </span>
                  </button>
                ) : (
                  <div
                    key={row.key}
                    className="flex items-center gap-1.5 overflow-hidden pl-3.5"
                    style={{ height: metrics.rowHeight }}
                  >
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-[2px]"
                      style={{ background: row.habit.color }}
                    />
                    <span className="truncate text-[11px] font-medium leading-none text-ink-soft">
                      {row.habit.name}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="relative shrink-0" style={{ width }}>
            {/* Month labels */}
            <div className="relative h-5">
              {bands.map((band) => (
                <span
                  key={band.month}
                  className="absolute top-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted"
                  style={{ left: band.left }}
                >
                  {band.width >= 28 ? MONTH_SHORT[band.month] : ""}
                </span>
              ))}
            </div>

            <div className="relative">
              {/* Today marker drawn once across every row */}
              {todayIndex >= 0 ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-y-0.5 z-10 rounded-full border border-ink/35"
                  style={{
                    left: todayIndex * metrics.columnPitch - 1.5,
                    width: metrics.cellWidth + 3,
                  }}
                />
              ) : null}

              <div style={{ display: "flex", flexDirection: "column", gap: ROW_GAP }}>
                {rows.map((row, index) => {
                  if (row.kind === "heading") {
                    // A hairline keeps groups legible across the full width.
                    return (
                      <div
                        key={row.key}
                        aria-hidden
                        className="flex items-center"
                        style={{ height: HEADING_HEIGHT, marginTop: headingOffset(index) }}
                      >
                        <span className="h-px w-full bg-line" />
                      </div>
                    );
                  }

                  const habit = row.habit;
                  const done = completedByHabit.get(habit.id) ?? new Set<DateKey>();
                  return (
                    <div key={row.key} className="flex" style={{ gap: CELL_GAP }}>
                      {days.map((date) => {
                        const isDone = done.has(date);
                        const dim = isFuture(date) || !isScheduledDay(habit.schedule, date);
                        return (
                          <span
                            key={date}
                            data-date={date}
                            data-habit={habit.id}
                            className="shrink-0 rounded-[2px] transition-colors duration-150"
                            style={{
                              width: metrics.cellWidth,
                              height: metrics.rowHeight,
                              background: isDone
                                ? habit.color
                                : dim
                                  ? "var(--cell-empty-off)"
                                  : "var(--cell-empty)",
                            }}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <GridTooltip state={tooltip} />
    </div>
  );
}
