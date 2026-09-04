"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { MAX_NOTE_LENGTH } from "@/types";

/**
 * A short free-text note for one day.
 *
 * Deliberately understated: when empty it's a single muted line, not a
 * journalling box. The app should never make you feel like you owe it a diary
 * entry — but the day you do write "squat PR" or "Solana event", that's what
 * makes the year worth scrolling back through.
 *
 * Saves on blur, so there's no save button to hunt for. Escape reverts.
 */
export function DayNote({
  value,
  onSave,
  editable = true,
}: {
  value: string;
  onSave: (text: string) => void;
  editable?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Lets Escape suppress the blur-save that immediately follows.
  const revertingRef = useRef(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (!editing) return;
    const node = textareaRef.current;
    if (!node) return;
    node.focus();
    // Caret to the end rather than selecting everything, so appending to an
    // existing note is the default action.
    node.setSelectionRange(node.value.length, node.value.length);
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (revertingRef.current) {
      revertingRef.current = false;
      setDraft(value);
      return;
    }
    if (draft.trim() !== value) onSave(draft);
  };

  if (!editable && !value) return null;

  if (editing) {
    return (
      <div className="border-t border-line pt-4">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, MAX_NOTE_LENGTH))}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              revertingRef.current = true;
              textareaRef.current?.blur();
            }
            // Enter saves; Shift+Enter keeps writing.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              textareaRef.current?.blur();
            }
          }}
          rows={2}
          placeholder="What happened today?"
          className="w-full resize-none rounded-xl border border-line bg-canvas px-3 py-2.5 text-[13.5px] leading-relaxed outline-none transition-colors placeholder:text-ink-muted focus:border-ink-muted"
        />
        <div className="mt-1 flex items-center justify-between">
          <p className="text-[11px] text-ink-muted">Enter to save · Esc to cancel</p>
          {draft.length > MAX_NOTE_LENGTH - 80 ? (
            <p className="text-[11px] tabular text-ink-muted">
              {MAX_NOTE_LENGTH - draft.length}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (!value) {
    return (
      <div className="border-t border-line pt-4">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <Plus size={13} strokeWidth={2.4} />
          Add a note
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-line pt-4">
      <button
        type="button"
        onClick={() => editable && setEditing(true)}
        disabled={!editable}
        className={[
          "w-full rounded-xl px-3 py-2.5 text-left text-[13.5px] leading-relaxed transition-colors",
          "bg-sunken/60 whitespace-pre-wrap",
          editable ? "hover:bg-sunken" : "cursor-default",
        ].join(" ")}
      >
        {value}
      </button>
    </div>
  );
}
