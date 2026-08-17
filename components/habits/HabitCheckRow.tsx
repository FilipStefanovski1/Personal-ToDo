"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { DateKey, Habit } from "@/types";
import { describeSchedule } from "@/lib/schedule";
import { readableOn, withAlpha } from "@/lib/colors";

/**
 * One tappable habit row. The entire row is the hit target — completing the
 * day should take one confident tap per habit, with no confirmation.
 */
export function HabitCheckRow({
  habit,
  date,
  completed,
  onToggle,
  meta,
}: {
  habit: Habit;
  date: DateKey;
  completed: boolean;
  onToggle: () => void;
  /** Optional trailing note, e.g. weekly progress for N×/week habits. */
  meta?: string;
}) {
  const [pop, setPop] = useState(false);
  const previous = useRef(completed);

  // Only animate on a real transition into "done", not on mount or re-render.
  useEffect(() => {
    if (completed && !previous.current) {
      setPop(true);
      const timer = setTimeout(() => setPop(false), 280);
      previous.current = completed;
      return () => clearTimeout(timer);
    }
    previous.current = completed;
  }, [completed]);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={completed}
      aria-label={`${habit.name}, ${completed ? "completed" : "not completed"}`}
      data-date={date}
      className={[
        "group flex w-full items-center gap-3.5 rounded-2xl border px-3.5 py-3 text-left",
        "transition-all duration-200 active:scale-[0.99]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        completed ? "border-transparent" : "border-line bg-surface hover:border-line-strong",
      ].join(" ")}
      style={completed ? { background: withAlpha(habit.color, 0.13) } : undefined}
    >
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-xl text-[18px] transition-transform duration-200 group-hover:scale-105"
        style={{ background: withAlpha(habit.color, completed ? 0.24 : 0.15) }}
      >
        {habit.emoji}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold tracking-tight">
          {habit.name}
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] text-ink-muted">
          {meta ?? describeSchedule(habit.schedule)}
        </span>
      </span>

      <span
        aria-hidden
        className={[
          "grid size-7 shrink-0 place-items-center rounded-full transition-all duration-200",
          pop ? "animate-pop" : "",
          completed ? "" : "border-2 border-line-strong group-hover:border-ink-muted",
        ].join(" ")}
        style={completed ? { background: habit.color } : undefined}
      >
        {completed ? (
          <Check size={16} strokeWidth={3.2} style={{ color: readableOn(habit.color) }} />
        ) : null}
      </span>
    </button>
  );
}
