"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { DateKey, Moment } from "@/types";
import { useStore } from "@/lib/store";
import { MomentEditor, type MomentDraft } from "./MomentEditor";

/**
 * The moments marked on one day, plus the quiet way to add one.
 *
 * Sits under the day's note and reads as its rarer sibling: a note is what
 * happened today, a moment is something you'd want to find again in December.
 */
export function DayMoments({ date }: { date: DateKey }) {
  const { momentsOn, addMoment, updateMoment, deleteMoment } = useStore();
  const [editing, setEditing] = useState<Moment | null>(null);
  const [open, setOpen] = useState(false);

  const moments = momentsOn(date);

  const save = (draft: MomentDraft) => {
    if (editing) updateMoment(editing.id, draft);
    else addMoment({ date, ...draft });
    setOpen(false);
    setEditing(null);
  };

  return (
    <div className="border-t border-line pt-4">
      {moments.length > 0 ? (
        <ul className="mb-2 space-y-1.5">
          {moments.map((moment) => (
            <li key={moment.id}>
              <button
                type="button"
                onClick={() => {
                  setEditing(moment);
                  setOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl bg-sunken/60 px-3 py-2 text-left transition-colors hover:bg-sunken"
              >
                <span aria-hidden className="text-[15px]">
                  {moment.emoji}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold tracking-tight">
                  {moment.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setEditing(null);
          setOpen(true);
        }}
        className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <Sparkles size={13} strokeWidth={2.2} />
        {moments.length > 0 ? "Mark another moment" : "Mark a moment"}
      </button>

      <MomentEditor
        open={open}
        date={date}
        moment={editing}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSave={save}
        onDelete={
          editing
            ? () => {
                deleteMoment(editing.id);
                setOpen(false);
                setEditing(null);
              }
            : undefined
        }
      />
    </div>
  );
}
