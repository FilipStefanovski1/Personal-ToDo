"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Category, GoalType } from "@/types";
import { Button } from "@/components/ui/Button";
import { Portal } from "@/components/ui/Portal";

export interface CategoryDraft {
  name: string;
  goalType: GoalType;
  goalTarget: number;
}

const EMPTY: CategoryDraft = { name: "", goalType: "all", goalTarget: 2 };

const GOALS: Array<{ value: GoalType; label: string; hint: string }> = [
  { value: "all", label: "Complete all", hint: "Every item must be done — e.g. Supplements." },
  { value: "any", label: "Complete any", hint: "At least one counts — e.g. Activity." },
  { value: "custom", label: "Custom goal", hint: "At least N items each day." },
];

/**
 * Create/edit sheet for a category. A category holds no completion data of its
 * own — only a name, an order and the goal used to judge its children.
 */
export function CategoryEditor({
  open,
  category,
  itemCount,
  onClose,
  onSave,
}: {
  open: boolean;
  category: Category | null;
  /** Used to bound the custom target sensibly. */
  itemCount: number;
  onClose: () => void;
  onSave: (draft: CategoryDraft) => void;
}) {
  const [draft, setDraft] = useState<CategoryDraft>(EMPTY);

  useEffect(() => {
    if (!open) return;
    setDraft(
      category
        ? { name: category.name, goalType: category.goalType, goalTarget: category.goalTarget }
        : EMPTY,
    );
  }, [open, category]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const submit = () => {
    if (!draft.name.trim()) return;
    onSave(draft);
  };

  const maxTarget = Math.max(2, itemCount || 6);

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
        aria-label={category ? "Edit category" : "New category"}
        className="animate-rise relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[26px] border border-line bg-surface sm:max-w-md sm:rounded-[26px]"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[16px] font-bold tracking-tight">
            {category ? "Edit category" : "New category"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
          >
            <X size={17} />
          </button>
        </div>

        <div className="tidy-scroll flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <input
            autoFocus
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Category name"
            maxLength={40}
            className="h-11 w-full rounded-xl border border-line bg-canvas px-3.5 text-[15px] font-medium outline-none transition-colors placeholder:text-ink-muted focus:border-ink-muted"
          />

          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Daily goal
            </p>
            <div className="space-y-1.5">
              {GOALS.map((goal) => {
                const active = draft.goalType === goal.value;
                return (
                  <button
                    key={goal.value}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, goalType: goal.value }))}
                    aria-pressed={active}
                    className={[
                      "w-full rounded-xl border px-3.5 py-2.5 text-left transition-all duration-150",
                      active
                        ? "border-ink bg-sunken"
                        : "border-line hover:border-line-strong",
                    ].join(" ")}
                  >
                    <p className="text-[13.5px] font-semibold tracking-tight">{goal.label}</p>
                    <p className="mt-0.5 text-[12px] text-ink-muted">{goal.hint}</p>
                  </button>
                );
              })}
            </div>

            {draft.goalType === "custom" ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Array.from({ length: maxTarget }, (_, i) => i + 1).map((n) => {
                  const active = draft.goalTarget === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, goalTarget: n }))}
                      aria-pressed={active}
                      className={[
                        "grid size-9 place-items-center rounded-xl border text-[12.5px] font-semibold tabular transition-all duration-150 active:scale-95",
                        active
                          ? "border-ink bg-ink text-canvas"
                          : "border-line text-ink-muted hover:border-line-strong",
                      ].join(" ")}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={!draft.name.trim()}
            className="flex-[2]"
          >
            {category ? "Save changes" : "Add category"}
          </Button>
        </div>
      </div>
    </div>
    </Portal>
  );
}
