"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Category, Goal, GoalPeriod, GoalSource, Habit } from "@/types";
import { todayKey } from "@/lib/dates";
import { Button } from "@/components/ui/Button";
import { Portal } from "@/components/ui/Portal";

export interface GoalDraft {
  name: string;
  source: GoalSource;
  target: number;
  period: GoalPeriod;
}

type PeriodKind = "year" | "custom" | "ongoing";

/**
 * Create/edit sheet for a goal.
 *
 * The whole flow is: pick the thing, pick the number, pick the stretch of
 * time. Everything else is inferred — the target is pre-filled from the
 * habit's own schedule (a 3×/week habit suggests 156 for a year), and the
 * name is optional because "Gym 150 times" writes itself.
 */
export function GoalEditor({
  open,
  goal,
  habits,
  categories,
  onClose,
  onSave,
}: {
  open: boolean;
  goal: Goal | null;
  habits: Habit[];
  categories: Category[];
  onClose: () => void;
  onSave: (draft: GoalDraft) => void;
}) {
  const currentYear = new Date().getFullYear();
  const [name, setName] = useState("");
  const [source, setSource] = useState<GoalSource | null>(null);
  const [target, setTarget] = useState("");
  const [periodKind, setPeriodKind] = useState<PeriodKind>("year");
  const [from, setFrom] = useState(todayKey());
  const [to, setTo] = useState(`${currentYear}-12-31`);

  useEffect(() => {
    if (!open) return;
    if (goal) {
      setName(goal.name);
      setSource(goal.source);
      setTarget(String(goal.target));
      setPeriodKind(goal.period.type);
      if (goal.period.type === "custom") {
        setFrom(goal.period.from);
        setTo(goal.period.to);
      } else if (goal.period.type === "ongoing") {
        setFrom(goal.period.from);
      }
    } else {
      setName("");
      setSource(null);
      setTarget("");
      setPeriodKind("year");
      setFrom(todayKey());
      setTo(`${currentYear}-12-31`);
    }
  }, [open, goal, currentYear]);

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

  /**
   * A sensible target for the chosen thing, so the number field starts
   * somewhere real instead of empty. Derived from the habit's own schedule
   * over a year — the app already knows how often you intend to do this.
   */
  const suggestedTarget = useMemo(() => {
    if (!source) return null;
    if (source.type === "category") return 200;
    const habit = habits.find((h) => h.id === source.habitId);
    if (!habit) return null;
    switch (habit.schedule.type) {
      case "daily":
        return 300;
      case "weekdays":
        return habit.schedule.days.length * 52;
      case "timesPerWeek":
        return habit.schedule.timesPerWeek * 52;
    }
  }, [source, habits]);

  if (!open) return null;

  const byCategory = categories.map((category) => ({
    category,
    items: habits.filter((h) => h.categoryId === category.id && !h.archived),
  }));

  const numericTarget = Number(target);
  const valid = source !== null && Number.isFinite(numericTarget) && numericTarget >= 1;

  const submit = () => {
    if (!source || !valid) return;
    const period: GoalPeriod =
      periodKind === "year"
        ? { type: "year", year: currentYear }
        : periodKind === "custom"
          ? { type: "custom", from, to }
          : { type: "ongoing", from };
    onSave({ name, source, target: Math.round(numericTarget), period });
  };

  const pickSource = (next: GoalSource) => {
    setSource(next);
    // Only pre-fill an untouched field, so an edit is never overwritten.
    if (!target) {
      const habit = next.type === "habit" ? habits.find((h) => h.id === next.habitId) : null;
      if (next.type === "category") setTarget("200");
      else if (habit) {
        const perYear =
          habit.schedule.type === "daily"
            ? 300
            : habit.schedule.type === "weekdays"
              ? habit.schedule.days.length * 52
              : habit.schedule.timesPerWeek * 52;
        setTarget(String(perYear));
      }
    }
  };

  const sameSource = (a: GoalSource, b: GoalSource) =>
    a.type === b.type &&
    (a.type === "habit"
      ? a.habitId === (b as { habitId: string }).habitId
      : a.categoryId === (b as { categoryId: string }).categoryId);

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
          aria-label={goal ? "Edit goal" : "New goal"}
          className="animate-rise relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[26px] border border-line bg-surface sm:max-w-md sm:rounded-[26px]"
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-[16px] font-bold tracking-tight">
              {goal ? "Edit goal" : "New goal"}
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
            <Field label="Track">
              <div className="space-y-3">
                {byCategory.map(({ category, items }) =>
                  items.length === 0 ? null : (
                    <div key={category.id}>
                      <button
                        type="button"
                        onClick={() => pickSource({ type: "category", categoryId: category.id })}
                        aria-pressed={
                          source !== null && sameSource(source, { type: "category", categoryId: category.id })
                        }
                        className={[
                          "mb-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] transition-all",
                          source !== null &&
                          sameSource(source, { type: "category", categoryId: category.id })
                            ? "border-ink bg-ink text-canvas"
                            : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
                        ].join(" ")}
                      >
                        {category.name}
                      </button>

                      <div className="flex flex-wrap gap-1.5">
                        {items.map((habit) => {
                          const active =
                            source !== null && sameSource(source, { type: "habit", habitId: habit.id });
                          return (
                            <button
                              key={habit.id}
                              type="button"
                              onClick={() => pickSource({ type: "habit", habitId: habit.id })}
                              aria-pressed={active}
                              className={[
                                "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12.5px] font-medium transition-all",
                                active
                                  ? "border-ink bg-ink text-canvas"
                                  : "border-line hover:border-line-strong",
                              ].join(" ")}
                            >
                              <span aria-hidden>{habit.emoji}</span>
                              {habit.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </Field>

            <Field label="Target">
              <div className="flex items-center gap-2">
                <input
                  inputMode="numeric"
                  value={target}
                  onChange={(event) => setTarget(event.target.value.replace(/[^0-9]/g, ""))}
                  onKeyDown={(event) => event.key === "Enter" && submit()}
                  placeholder={suggestedTarget ? String(suggestedTarget) : "150"}
                  className="h-11 w-28 rounded-xl border border-line bg-canvas px-3.5 text-[15px] font-semibold tabular outline-none transition-colors placeholder:font-normal placeholder:text-ink-muted focus:border-ink-muted"
                />
                <span className="text-[13px] text-ink-muted">
                  {source?.type === "category" ? "active days" : "times"}
                </span>
              </div>
            </Field>

            <Field label="Period">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["year", `This year (${currentYear})`],
                    ["custom", "Date range"],
                    ["ongoing", "Ongoing"],
                  ] as Array<[PeriodKind, string]>
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPeriodKind(value)}
                    aria-pressed={periodKind === value}
                    className={[
                      "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all",
                      periodKind === value
                        ? "border-ink bg-ink text-canvas"
                        : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {periodKind === "custom" ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="h-10 flex-1 rounded-xl border border-line bg-canvas px-3 text-[13px] outline-none focus:border-ink-muted"
                  />
                  <span className="text-[12px] text-ink-muted">to</span>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="h-10 flex-1 rounded-xl border border-line bg-canvas px-3 text-[13px] outline-none focus:border-ink-muted"
                  />
                </div>
              ) : null}

              {periodKind === "ongoing" ? (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[12px] text-ink-muted">Counting since</span>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="h-10 flex-1 rounded-xl border border-line bg-canvas px-3 text-[13px] outline-none focus:border-ink-muted"
                  />
                </div>
              ) : null}
            </Field>

            <Field label="Name (optional)">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && submit()}
                placeholder="Left blank, it names itself"
                maxLength={60}
                className="h-11 w-full rounded-xl border border-line bg-canvas px-3.5 text-[14px] outline-none transition-colors placeholder:text-ink-muted focus:border-ink-muted"
              />
            </Field>
          </div>

          <div className="flex gap-2 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={!valid} className="flex-[2]">
              {goal ? "Save changes" : "Add goal"}
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
