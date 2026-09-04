"use client";

import { History } from "lucide-react";
import type { OnThisDayEntry } from "@/lib/recap";
import { MONTH_NAMES } from "@/lib/dates";

/**
 * A single quiet line connecting today to a past one, when there's genuinely
 * something to connect it to. Today stays a checklist, not a scrollback —
 * this shows the single most recent year with a record on this date, nothing
 * more.
 */
export function OnThisDay({ entry }: { entry: OnThisDayEntry }) {
  const [, month, day] = entry.date.split("-").map(Number);
  const dateLabel = `${MONTH_NAMES[month - 1]} ${day}, ${entry.year}`;

  const parts: string[] = [];
  if (entry.completedNames.length > 0) {
    parts.push(entry.completedNames.length === 1 ? entry.completedNames[0] : `${entry.completedNames.length} things done`);
  }
  if (entry.moments.length > 0) {
    parts.push(entry.moments.map((m) => `${m.emoji} ${m.title}`).join(", "));
  }
  if (entry.note) parts.push(entry.note);

  return (
    <div className="flex items-start gap-3 rounded-card border border-line bg-surface px-5 py-4">
      <History size={16} className="mt-0.5 shrink-0 text-ink-muted" strokeWidth={2} />
      <div className="min-w-0">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          On this day · {dateLabel}
        </p>
        <p className="mt-1 truncate text-[13.5px] leading-relaxed text-ink-soft">
          {parts.join(" · ")}
        </p>
      </div>
    </div>
  );
}
