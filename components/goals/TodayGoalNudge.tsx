"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { GoalProgress } from "@/types";
import { withAlpha } from "@/lib/colors";
import { nudgeLabel } from "@/lib/goals";

/**
 * The one goal worth a glance today, and never more than one.
 *
 * Tone is the whole design here. It surfaces a goal only when a single day's
 * effort would visibly change it — either you're within a few of the pace, or
 * you're close to the finish. Anything further behind gets no line at all,
 * because "28 sessions behind" on a Tuesday morning is not information, it's
 * just a bad mood.
 */
export function TodayGoalNudge({
  progress,
  label,
  color,
  doneToday,
}: {
  progress: GoalProgress;
  label: string;
  color: string;
  doneToday: boolean;
}) {
  const nudge = nudgeLabel(progress);
  const remaining = progress.target - progress.current;
  const nearlyThere = progress.status === "active" && remaining > 0 && remaining <= 3;

  const message = doneToday
    ? `Counted today — ${progress.current} of ${progress.target}`
    : nearlyThere
      ? `${remaining} to go`
      : nudge;

  if (!message) return null;

  return (
    <Link
      href="/goals"
      className="group flex items-center justify-between gap-4 rounded-card border border-line bg-surface px-5 py-4 transition-all duration-200 hover:border-line-strong"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="h-8 w-1.5 shrink-0 rounded-full"
          style={{ background: withAlpha(color, doneToday ? 1 : 0.45) }}
        />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold tracking-tight">{label}</p>
          <p className="mt-0.5 truncate text-[12.5px] text-ink-muted">{message}</p>
        </div>
      </div>
      <ArrowRight
        size={18}
        className="shrink-0 text-ink-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink"
      />
    </Link>
  );
}
