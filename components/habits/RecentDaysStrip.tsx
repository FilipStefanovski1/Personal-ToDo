"use client";

import { useEffect, useMemo, useRef } from "react";
import type { DateKey } from "@/types";
import { useStore } from "@/lib/store";
import { DAY_INITIALS, fromDateKey, shiftKey, todayKey } from "@/lib/dates";
import { isHabitDueOn } from "@/lib/schedule";
import { stripeBackground } from "@/lib/colors";

/**
 * The last two weeks as tappable chips, so fixing a day you forgot to check
 * off never requires leaving the Today screen.
 */
export function RecentDaysStrip({
  selected,
  onSelect,
  days = 14,
}: {
  selected: DateKey;
  onSelect: (date: DateKey) => void;
  days?: number;
}) {
  const { activeHabits, completionsOn } = useStore();
  const today = todayKey();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Today sits at the far right; on narrow screens it would start off-screen.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollLeft = node.scrollWidth;
  }, [days]);

  const items = useMemo(() => {
    const list: Array<{ key: DateKey; ratio: number; colors: string[] }> = [];
    for (let offset = days - 1; offset >= 0; offset--) {
      const key = shiftKey(today, -offset);
      const done = new Set(completionsOn(key));
      const due = activeHabits.filter((h) => isHabitDueOn(h, key));
      const completed = activeHabits.filter((h) => done.has(h.id));
      list.push({
        key,
        ratio: due.length === 0 ? 0 : completed.length / due.length,
        colors: completed.map((h) => h.color),
      });
    }
    return list;
  }, [activeHabits, completionsOn, days, today]);

  return (
    <div
      ref={scrollRef}
      className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0"
    >
      {items.map(({ key, colors }) => {
        const date = fromDateKey(key);
        const isSelected = key === selected;
        const isToday = key === today;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            aria-current={isSelected ? "date" : undefined}
            className={[
              "flex w-11 shrink-0 flex-col items-center gap-1.5 rounded-2xl border px-1 py-2 transition-all duration-150",
              "active:scale-[0.96]",
              isSelected
                ? "border-ink bg-surface"
                : "border-line bg-surface/60 hover:border-line-strong",
            ].join(" ")}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              {DAY_INITIALS[date.getDay()]}
            </span>
            <span
              className={[
                "text-[13px] font-semibold tabular",
                isToday ? "text-ink" : "text-ink-soft",
              ].join(" ")}
            >
              {date.getDate()}
            </span>
            <span
              aria-hidden
              className="h-1.5 w-6 rounded-full"
              style={{
                background: colors.length ? stripeBackground(colors) : "var(--cell-empty)",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
