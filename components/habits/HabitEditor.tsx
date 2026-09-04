"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import type { Category, Habit, HabitSchedule, Weekday } from "@/types";
import {
  DEFAULT_COLOR,
  EMOJI_CHOICES,
  PALETTE,
  isValidHex,
  readableOn,
  withAlpha,
} from "@/lib/colors";
import { DAY_INITIALS, weekdayOrder } from "@/lib/dates";
import { Button } from "@/components/ui/Button";
import { Portal } from "@/components/ui/Portal";

export interface HabitDraft {
  categoryId: string;
  name: string;
  emoji: string;
  color: string;
  schedule: HabitSchedule;
}

type ScheduleKind = HabitSchedule["type"];

const EMPTY: HabitDraft = {
  categoryId: "",
  name: "",
  emoji: "🎯",
  color: DEFAULT_COLOR,
  schedule: { type: "daily" },
};

/**
 * Create/edit sheet. Full-screen on mobile, centred dialog on desktop.
 * Everything a habit is — name, icon, colour, schedule — lives here.
 */
export function HabitEditor({
  open,
  habit,
  categories,
  defaultCategoryId,
  weekStartsOn,
  onClose,
  onSave,
}: {
  open: boolean;
  habit: Habit | null;
  categories: Category[];
  /** Pre-selected group when adding from a category's own "Add item". */
  defaultCategoryId?: string;
  weekStartsOn: 0 | 1;
  onClose: () => void;
  onSave: (draft: HabitDraft) => void;
}) {
  const [draft, setDraft] = useState<HabitDraft>(EMPTY);
  const [customColor, setCustomColor] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(
      habit
        ? {
            categoryId: habit.categoryId,
            name: habit.name,
            emoji: habit.emoji,
            color: habit.color,
            schedule: habit.schedule,
          }
        : {
            ...EMPTY,
            categoryId: defaultCategoryId ?? categories[0]?.id ?? "",
          },
    );
    const initial = habit?.color ?? DEFAULT_COLOR;
    const isPreset = PALETTE.some((s) => s.hex.toLowerCase() === initial.toLowerCase());
    setCustomColor(isPreset ? "" : initial);
  }, [open, habit, defaultCategoryId, categories]);

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

  const kind: ScheduleKind = draft.schedule.type;

  const setKind = (next: ScheduleKind) => {
    setDraft((d) => {
      if (next === d.schedule.type) return d;
      if (next === "daily") return { ...d, schedule: { type: "daily" } };
      if (next === "timesPerWeek")
        return { ...d, schedule: { type: "timesPerWeek", timesPerWeek: 3 } };
      return { ...d, schedule: { type: "weekdays", days: [1, 2, 3, 4, 5] } };
    });
  };

  const toggleDay = (day: Weekday) => {
    setDraft((d) => {
      if (d.schedule.type !== "weekdays") return d;
      const has = d.schedule.days.includes(day);
      const days = has
        ? d.schedule.days.filter((x) => x !== day)
        : [...d.schedule.days, day].sort();
      // Never allow an empty weekday set — it would mean "never due".
      if (days.length === 0) return d;
      return { ...d, schedule: { type: "weekdays", days } };
    });
  };

  const submit = () => {
    if (!draft.name.trim() || !draft.categoryId) return;
    onSave(draft);
  };

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
        aria-label={habit ? "Edit item" : "New item"}
        className="animate-rise relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[26px] border border-line bg-surface sm:max-w-md sm:rounded-[26px]"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[16px] font-bold tracking-tight">
            {habit ? "Edit item" : "New item"}
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
          {/* Name + live preview of the icon chip */}
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid size-12 shrink-0 place-items-center rounded-2xl text-[22px]"
              style={{ background: withAlpha(draft.color, 0.18) }}
            >
              {draft.emoji}
            </span>
            <input
              autoFocus
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Habit name"
              maxLength={48}
              className="h-11 w-full rounded-xl border border-line bg-canvas px-3.5 text-[15px] font-medium outline-none transition-colors placeholder:text-ink-muted focus:border-ink-muted"
            />
          </div>

          <Field label="Category">
            <div className="flex flex-wrap gap-1.5">
              {categories.map((category) => {
                const active = draft.categoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, categoryId: category.id }))}
                    aria-pressed={active}
                    className={[
                      "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all duration-150",
                      active
                        ? "border-ink bg-ink text-canvas"
                        : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
                    ].join(" ")}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Icon">
            <div className="grid grid-cols-10 gap-1">
              {EMOJI_CHOICES.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, emoji }))}
                  aria-label={emoji}
                  aria-pressed={draft.emoji === emoji}
                  className={[
                    "grid aspect-square place-items-center rounded-lg text-[16px] transition-all duration-150",
                    draft.emoji === emoji
                      ? "bg-sunken ring-2 ring-ink"
                      : "hover:bg-sunken active:scale-90",
                  ].join(" ")}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Colour">
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((swatch) => {
                const active = draft.color.toLowerCase() === swatch.hex.toLowerCase();
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, color: swatch.hex }))}
                    aria-label={swatch.name}
                    aria-pressed={active}
                    title={swatch.name}
                    className="grid size-8 place-items-center rounded-xl transition-transform duration-150 hover:scale-110 active:scale-95"
                    style={{ background: swatch.hex }}
                  >
                    {active ? (
                      <Check size={15} strokeWidth={3} style={{ color: readableOn(swatch.hex) }} />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* The curated palette is the primary interface; a hex field is
                available for anyone who wants something specific. */}
            <div className="mt-3 flex items-center gap-2">
              <span
                aria-hidden
                className="size-8 shrink-0 rounded-xl border border-line"
                style={{ background: draft.color }}
              />
              <input
                value={customColor}
                onChange={(event) => {
                  const next = event.target.value.trim();
                  setCustomColor(next);
                  const withHash = next.startsWith("#") ? next : `#${next}`;
                  if (isValidHex(withHash)) setDraft((d) => ({ ...d, color: withHash }));
                }}
                placeholder="Custom hex, e.g. #4F8DF5"
                spellCheck={false}
                maxLength={7}
                aria-label="Custom colour hex code"
                className="h-9 w-full rounded-xl border border-line bg-canvas px-3 text-[13px] outline-none transition-colors placeholder:text-ink-muted focus:border-ink-muted"
              />
            </div>
          </Field>

          <Field label="Repeats">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["daily", "Every day"],
                  ["weekdays", "Specific days"],
                  ["timesPerWeek", "Times per week"],
                ] as Array<[ScheduleKind, string]>
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setKind(value)}
                  aria-pressed={kind === value}
                  className={[
                    "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all duration-150",
                    kind === value
                      ? "border-ink bg-ink text-canvas"
                      : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>

            {draft.schedule.type === "weekdays" ? (
              <div className="mt-3 flex gap-1.5">
                {weekdayOrder(weekStartsOn).map((day) => {
                  const active = draft.schedule.type === "weekdays" && draft.schedule.days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      aria-pressed={active}
                      aria-label={`Weekday ${day}`}
                      className={[
                        "grid h-9 flex-1 place-items-center rounded-xl border text-[12.5px] font-semibold transition-all duration-150 active:scale-95",
                        active
                          ? "border-transparent text-white"
                          : "border-line text-ink-muted hover:border-line-strong",
                      ].join(" ")}
                      style={
                        active
                          ? { background: draft.color, color: readableOn(draft.color) }
                          : undefined
                      }
                    >
                      {DAY_INITIALS[day]}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {draft.schedule.type === "timesPerWeek" ? (
              <div className="mt-3 flex gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                  const active =
                    draft.schedule.type === "timesPerWeek" && draft.schedule.timesPerWeek === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          schedule: { type: "timesPerWeek", timesPerWeek: n },
                        }))
                      }
                      aria-pressed={active}
                      className={[
                        "grid h-9 flex-1 place-items-center rounded-xl border text-[12.5px] font-semibold tabular transition-all duration-150 active:scale-95",
                        active ? "border-transparent" : "border-line text-ink-muted hover:border-line-strong",
                      ].join(" ")}
                      style={
                        active
                          ? { background: draft.color, color: readableOn(draft.color) }
                          : undefined
                      }
                    >
                      {n}×
                    </button>
                  );
                })}
              </div>
            ) : null}
          </Field>
        </div>

        <div className="flex gap-2 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={!draft.name.trim() || !draft.categoryId}
            className="flex-[2]"
          >
            {habit ? "Save changes" : "Add item"}
          </Button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </p>
      {children}
    </div>
  );
}
