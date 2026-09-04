"use client";

import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, Pencil, Plus, Target, Trash2 } from "lucide-react";
import type { Goal, GoalProgress } from "@/types";
import { useStore } from "@/lib/store";
import {
  computeGoalProgress,
  goalColor,
  goalLabel,
  goalSourceExists,
  sortGoalsForDisplay,
} from "@/lib/goals";
import { formatShortDate } from "@/lib/dates";
import { DEFAULT_COLOR } from "@/lib/colors";
import { GoalRow } from "@/components/goals/GoalRow";
import { GoalEditor, type GoalDraft } from "@/components/goals/GoalEditor";
import { Button } from "@/components/ui/Button";
import { Card, SectionLabel } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export default function GoalsPage() {
  const {
    ready,
    goals,
    activeGoals,
    habits,
    activeHabits,
    activeCategories,
    categories,
    data,
    addGoal,
    updateGoal,
    deleteGoal,
    setGoalArchived,
  } = useStore();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const progressById = useMemo(() => {
    const map = new Map<string, GoalProgress>();
    for (const goal of goals) {
      map.set(goal.id, computeGoalProgress(goal, data.completions, habits));
    }
    return map;
  }, [goals, data.completions, habits]);

  const shown = useMemo(
    () => sortGoalsForDisplay(activeGoals.map((g) => progressById.get(g.id)!).filter(Boolean)),
    [activeGoals, progressById],
  );

  const archived = useMemo(() => goals.filter((g) => g.archived), [goals]);

  if (!ready) return <PageSkeleton />;

  const save = (draft: GoalDraft) => {
    if (editing) updateGoal(editing.id, draft);
    else addGoal(draft);
    setEditorOpen(false);
    setEditing(null);
  };

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const canCreate = activeHabits.length > 0;

  return (
    <div className="animate-rise space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
            {shown.filter((p) => p.status === "active").length} in progress
          </p>
          <h1 className="mt-1 text-[34px] font-bold leading-none tracking-[-0.03em] md:text-[42px]">
            Goals
          </h1>
        </div>
        <Button variant="primary" onClick={openNew} disabled={!canCreate}>
          <Plus size={16} strokeWidth={2.5} />
          New goal
        </Button>
      </header>

      {shown.length === 0 ? (
        <EmptyState
          title={canCreate ? "No goals yet" : "Add a habit first"}
          description={
            canCreate
              ? "Set a target against something you already track — the progress fills itself in from what you've recorded."
              : "Goals count the habits you're already tracking, so start with one of those."
          }
          action={
            canCreate ? (
              <Button variant="primary" onClick={openNew}>
                Set your first goal
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {shown.map((progress) => {
            const goal = progress.goal;
            const label = goalLabel(goal, habits, categories);
            const detached = !goalSourceExists(goal, habits, categories);
            const isOpen = expanded === goal.id;

            return (
              <div key={goal.id}>
                <GoalRow
                  progress={progress}
                  label={label}
                  color={goalColor(goal.source, habits, DEFAULT_COLOR)}
                  detached={detached}
                  onClick={() => setExpanded(isOpen ? null : goal.id)}
                />

                {isOpen ? (
                  <div className="animate-rise space-y-4 border-t border-line bg-sunken/40 px-4 py-4">
                    {progress.milestones.length > 0 ? (
                      <div>
                        <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                          Milestones
                        </p>
                        <ul className="space-y-1">
                          {progress.milestones.map((milestone) => (
                            <li
                              key={milestone.value}
                              className="flex items-baseline justify-between gap-3 text-[12.5px]"
                            >
                              <span
                                className={
                                  milestone.isTarget ? "font-semibold text-ink" : "text-ink-soft"
                                }
                              >
                                {milestone.value}{" "}
                                {goal.source.type === "category" ? "days" : "times"}
                              </span>
                              <span className="tabular text-ink-muted">
                                {formatShortDate(milestone.date)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-[12.5px] text-ink-muted">
                        Milestones appear as you pass a quarter, half and three quarters of the way.
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditing(goal);
                          setEditorOpen(true);
                        }}
                      >
                        <Pencil size={14} />
                        Edit
                      </Button>
                      <Button size="sm" onClick={() => setGoalArchived(goal.id, true)}>
                        <Archive size={14} />
                        Archive
                      </Button>
                      {confirmDelete === goal.id ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              deleteGoal(goal.id);
                              setConfirmDelete(null);
                            }}
                          >
                            Delete goal
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="danger" onClick={() => setConfirmDelete(goal.id)}>
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>

                    {confirmDelete === goal.id ? (
                      <p className="text-[12px] text-ink-muted">
                        Deleting the goal keeps every completion it was counting.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </Card>
      )}

      {archived.length > 0 ? (
        <section className="space-y-3">
          <SectionLabel>Archived</SectionLabel>
          <Card className="divide-y divide-line overflow-hidden">
            {archived.map((goal) => {
              const progress = progressById.get(goal.id)!;
              return (
                <div key={goal.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold tracking-tight">
                      {goalLabel(goal, habits, categories)}
                    </p>
                    <p className="text-[11.5px] tabular text-ink-muted">
                      {progress.current} / {progress.target} · {progress.percent}%
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setGoalArchived(goal.id, false)}>
                    <ArchiveRestore size={14} />
                    Restore
                  </Button>
                </div>
              );
            })}
          </Card>
        </section>
      ) : null}

      {shown.length > 0 ? (
        <p className="flex items-start gap-2 px-1 text-[12px] leading-relaxed text-ink-muted">
          <Target size={13} className="mt-0.5 shrink-0" />
          Progress is counted from what you&rsquo;ve already recorded — there&rsquo;s nothing here to
          keep up to date by hand.
        </p>
      ) : null}

      <GoalEditor
        open={editorOpen}
        goal={editing}
        habits={activeHabits}
        categories={activeCategories}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSave={save}
      />
    </div>
  );
}
