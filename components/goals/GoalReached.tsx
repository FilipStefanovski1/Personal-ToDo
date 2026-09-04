"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import type { GoalProgress } from "@/types";
import { withAlpha } from "@/lib/colors";

/**
 * A goal landing, acknowledged on the day it lands.
 *
 * The brief asked for completion to feel subtle and memorable, which rules out
 * confetti and rules out a number quietly ticking over unremarked. This is the
 * middle: the goal's own colour arrives filled in, the line says the thing
 * plainly, and it is gone tomorrow.
 *
 * There is nothing to dismiss and nothing stored — it shows for goals whose
 * derived `completedOn` is today, so it appears the moment the tap lands, it
 * survives a reload on the same day, and it retires itself at midnight.
 */
export function GoalReached({
  progress,
  label,
  color,
}: {
  progress: GoalProgress;
  label: string;
  color: string;
}) {
  return (
    <Link
      href="/goals"
      className="animate-rise flex items-center gap-3.5 rounded-card border px-5 py-4 transition-colors"
      style={{ borderColor: withAlpha(color, 0.35), background: withAlpha(color, 0.07) }}
    >
      <span
        aria-hidden
        className="animate-pop flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{ background: color }}
      >
        <Check size={15} strokeWidth={3} className="text-white" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-semibold tracking-tight">{label}</p>
        <p className="mt-0.5 text-[12.5px] text-ink-muted">
          Reached today — {progress.current} of {progress.target}
        </p>
      </div>
    </Link>
  );
}
