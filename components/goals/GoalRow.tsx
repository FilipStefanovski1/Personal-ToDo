"use client";

import { Check } from "lucide-react";
import type { GoalProgress } from "@/types";
import { withAlpha } from "@/lib/colors";
import { formatShortDate } from "@/lib/dates";
import { paceLabel } from "@/lib/goals";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

/**
 * One goal, readable in about a second.
 *
 * The bar carries a pace marker — a thin tick at where a steady pace would
 * have you today. Whether the fill has passed the tick answers "am I on
 * track?" before you've read a single number, which is the whole job. The
 * numbers underneath are for when you want the detail.
 */
export function GoalRow({
  progress,
  label,
  color,
  detached,
  onClick,
}: {
  progress: GoalProgress;
  label: string;
  color: string;
  /** The habit or category behind this goal no longer exists. */
  detached?: boolean;
  onClick?: () => void;
}) {
  const { current, target, percent, status, expected, daysRemaining } = progress;
  const pace = paceLabel(progress);

  // Where a steady pace would put the fill, as a share of the bar.
  const paceMark =
    expected === null || status !== "active"
      ? null
      : Math.min(100, Math.round((expected / target) * 100));

  const done = status === "completed";
  const ended = status === "ended";

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={[
        "block w-full px-4 py-3.5 text-left transition-colors",
        onClick ? "hover:bg-sunken/50" : "",
        ended ? "opacity-70" : "",
      ].join(" ")}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-[14px] font-semibold tracking-tight">
          {label}
          {detached ? (
            <span className="ml-1.5 text-[11px] font-medium text-ink-muted">· detached</span>
          ) : null}
        </p>
        <p className="shrink-0 text-[13px] tabular text-ink-muted">
          <span className="font-semibold text-ink">
            <AnimatedNumber value={current} />
          </span>
          {" / "}
          {target}
        </p>
      </div>

      <div
        className="relative mt-2 h-2 overflow-hidden rounded-full"
        style={{ background: withAlpha(color, 0.15) }}
        aria-hidden
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${percent}%`, background: color }}
        />
        {paceMark !== null ? (
          <span
            className="absolute top-0 h-full w-px bg-ink/45"
            style={{ left: `${paceMark}%` }}
            title="Steady pace"
          />
        ) : null}
      </div>

      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[12px] text-ink-muted">
        {done ? (
          <span className="inline-flex items-center gap-1 font-medium text-ink-soft">
            <Check size={12} strokeWidth={3} />
            {progress.completedOn ? `Reached ${formatShortDate(progress.completedOn)}` : "Reached"}
          </span>
        ) : (
          <>
            <span className="tabular">{percent}%</span>
            {pace ? <span>· {pace}</span> : null}
            {!ended && daysRemaining !== null ? (
              <span>
                · {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
              </span>
            ) : null}
          </>
        )}
      </p>
    </Wrapper>
  );
}
