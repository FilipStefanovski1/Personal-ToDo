"use client";

import { useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";
import type { DateKey, Moment } from "@/types";
import { MAX_MOMENT_TITLE_LENGTH } from "@/types";
import { formatLongDate } from "@/lib/dates";
import { Button } from "@/components/ui/Button";
import { Portal } from "@/components/ui/Portal";

/** Emoji that suit a moment rather than a habit. */
const MOMENT_EMOJI = [
  "✦", "🚀", "🎉", "🏆", "✈️", "🎂", "💼", "🎓",
  "🏀", "📦", "❤️", "🏡", "🎸", "📸", "🌍", "💡",
];

export interface MomentDraft {
  title: string;
  emoji: string;
}

/**
 * A moment is three fields and no more: the day it happened, a title, an
 * icon. Anything longer belongs in the day's note, which sits right above it.
 */
export function MomentEditor({
  open,
  date,
  moment,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  date: DateKey;
  moment: Moment | null;
  onClose: () => void;
  onSave: (draft: MomentDraft) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("✦");

  useEffect(() => {
    if (!open) return;
    setTitle(moment?.title ?? "");
    setEmoji(moment?.emoji ?? "✦");
  }, [open, moment]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = () => {
    if (!title.trim()) return;
    onSave({ title, emoji });
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label={moment ? "Edit moment" : "Mark a moment"}
          className="animate-rise relative flex w-full flex-col overflow-hidden rounded-t-[26px] border border-line bg-surface sm:max-w-sm sm:rounded-[26px]"
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-[16px] font-bold tracking-tight">
                {moment ? "Edit moment" : "Mark a moment"}
              </h2>
              <p className="mt-0.5 truncate text-[12px] text-ink-muted">{formatLongDate(date)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid size-8 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
            >
              <X size={17} />
            </button>
          </div>

          <div className="space-y-5 px-5 py-5">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sunken text-[22px]"
              >
                {emoji}
              </span>
              <input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && submit()}
                placeholder="Shipped Aminta v1"
                maxLength={MAX_MOMENT_TITLE_LENGTH}
                className="h-11 w-full rounded-xl border border-line bg-canvas px-3.5 text-[15px] font-medium outline-none transition-colors placeholder:text-ink-muted focus:border-ink-muted"
              />
            </div>

            <div className="grid grid-cols-8 gap-1">
              {MOMENT_EMOJI.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setEmoji(option)}
                  aria-label={option}
                  aria-pressed={emoji === option}
                  className={[
                    "grid aspect-square place-items-center rounded-lg text-[16px] transition-all duration-150",
                    emoji === option ? "bg-sunken ring-2 ring-ink" : "hover:bg-sunken active:scale-90",
                  ].join(" ")}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {moment && onDelete ? (
              <Button variant="danger" onClick={onDelete} aria-label="Delete moment">
                <Trash2 size={15} />
              </Button>
            ) : null}
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={!title.trim()} className="flex-[2]">
              {moment ? "Save" : "Mark it"}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
