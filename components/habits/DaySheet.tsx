"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { DateKey } from "@/types";
import { formatLongDate, isFuture, isToday, shiftKey } from "@/lib/dates";
import { DayChecklist } from "./DayChecklist";
import { Portal } from "@/components/ui/Portal";

/**
 * A full day, opened from anywhere — the year grid, the month calendar.
 *
 * The year grid used to be a dead end: you could see a cell but not act on it.
 * Clicking through to the real checklist makes the whole history editable from
 * the one screen you actually spend time looking at.
 *
 * Arrow keys step between days so you can review a stretch of the year without
 * closing and reopening.
 */
export function DaySheet({
  date,
  onClose,
  onNavigate,
}: {
  date: DateKey | null;
  onClose: () => void;
  onNavigate: (date: DateKey) => void;
}) {
  useEffect(() => {
    if (!date) return;

    const previous = shiftKey(date, -1);
    const next = shiftKey(date, 1);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onNavigate(previous);
      // Never step into a day that hasn't happened yet.
      if (event.key === "ArrowRight" && !isFuture(next)) onNavigate(next);
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [date, onClose, onNavigate]);

  if (!date) return null;

  const next = shiftKey(date, 1);
  const canGoForward = !isFuture(next);

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label={formatLongDate(date)}
          className="animate-rise relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[26px] border border-line bg-surface sm:max-w-lg sm:rounded-[26px]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                {isToday(date) ? "Today" : "Day"}
              </p>
              <h2 className="mt-0.5 truncate text-[17px] font-bold tracking-[-0.02em]">
                {formatLongDate(date)}
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onNavigate(shiftKey(date, -1))}
                aria-label="Previous day"
                className="grid size-8 place-items-center rounded-full text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                onClick={() => canGoForward && onNavigate(next)}
                disabled={!canGoForward}
                aria-label="Next day"
                className="grid size-8 place-items-center rounded-full text-ink-muted transition-colors hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight size={17} />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="ml-1 grid size-8 place-items-center rounded-full text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          <div className="tidy-scroll flex-1 overflow-y-auto px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <DayChecklist date={date} sickToggleVariant="inline" />
          </div>
        </div>
      </div>
    </Portal>
  );
}
