"use client";

import { useMemo } from "react";
import type { DateKey, Habit } from "@/types";
import { useStore } from "@/lib/store";
import {
  DAY_INITIALS,
  daysInMonthKeys,
  getWeekday,
  isFuture,
  todayKey,
  weekdayOrder,
} from "@/lib/dates";

const MAX_DOTS = 4;

/**
 * A conventional month calendar where each day carries small colour blocks for
 * the habits completed that day.
 */
export function MonthGrid({
  year,
  month,
  selected,
  onSelect,
}: {
  year: number;
  month: number;
  selected: DateKey;
  onSelect: (date: DateKey) => void;
}) {
  const { activeHabits, habits, completionsOn, settings } = useStore();
  const today = todayKey();

  const habitById = useMemo(() => new Map(habits.map((h) => [h.id, h])), [habits]);
  const order = useMemo(() => weekdayOrder(settings.weekStartsOn), [settings.weekStartsOn]);

  const days = useMemo(() => daysInMonthKeys(year, month), [year, month]);
  const leadingBlanks = days.length
    ? (getWeekday(days[0]) - settings.weekStartsOn + 7) % 7
    : 0;

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1.5">
        {order.map((weekday, i) => (
          <div
            key={i}
            className="text-center text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted"
          >
            {DAY_INITIALS[weekday]}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} aria-hidden />
        ))}

        {days.map((date) => {
          const completed = completionsOn(date)
            .map((id) => habitById.get(id))
            .filter((h): h is Habit => !!h)
            .sort((a, b) => a.order - b.order);

          const isSelected = date === selected;
          const isToday = date === today;
          const future = isFuture(date);
          const dayNumber = Number(date.slice(8, 10));

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              disabled={future}
              aria-current={isToday ? "date" : undefined}
              aria-label={`${date}, ${completed.length} completed`}
              className={[
                "group relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border p-1",
                "transition-all duration-150 active:scale-[0.96]",
                future
                  ? "cursor-not-allowed border-transparent opacity-35"
                  : isSelected
                    ? "border-ink bg-surface"
                    : "border-line bg-surface hover:border-line-strong hover:bg-sunken/50",
              ].join(" ")}
            >
              <span
                className={[
                  "text-[13px] leading-none tabular",
                  isToday ? "font-bold text-ink" : "font-medium text-ink-soft",
                ].join(" ")}
              >
                {dayNumber}
              </span>

              <span className="flex h-2 items-center justify-center gap-[3px]" aria-hidden>
                {completed.slice(0, MAX_DOTS).map((habit) => (
                  <span
                    key={habit.id}
                    className="size-1.5 rounded-[2px] cell-enter"
                    style={{ background: habit.color }}
                  />
                ))}
                {completed.length > MAX_DOTS ? (
                  <span className="text-[9px] font-bold leading-none text-ink-muted">
                    +{completed.length - MAX_DOTS}
                  </span>
                ) : null}
              </span>

              {isToday ? (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-xl ring-1 ring-ink/45"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {activeHabits.length === 0 ? (
        <p className="mt-4 text-center text-[13px] text-ink-muted">
          Add a habit to start filling this in.
        </p>
      ) : null}
    </div>
  );
}
