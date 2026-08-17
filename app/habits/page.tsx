"use client";

import { useMemo, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { Category, Habit } from "@/types";
import { useStore } from "@/lib/store";
import { describeSchedule } from "@/lib/schedule";
import { describeGoal, groupByCategory } from "@/lib/categories";
import { withAlpha } from "@/lib/colors";
import { HabitEditor, type HabitDraft } from "@/components/habits/HabitEditor";
import { CategoryEditor, type CategoryDraft } from "@/components/habits/CategoryEditor";
import { Button } from "@/components/ui/Button";
import { Card, SectionLabel } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

/** What's currently being dragged, so drop targets know what they may accept. */
type Drag = { kind: "category" | "habit"; id: string } | null;

export default function HabitsPage() {
  const {
    ready,
    categories,
    habits,
    settings,
    addCategory,
    updateCategory,
    deleteCategory,
    setCategoryArchived,
    toggleCollapsed,
    moveCategory,
    reorderCategory,
    addHabit,
    updateHabit,
    deleteHabit,
    setArchived,
    moveHabit,
    reorderHabit,
  } = useStore();

  const [habitEditor, setHabitEditor] = useState<{
    open: boolean;
    habit: Habit | null;
    categoryId?: string;
  }>({ open: false, habit: null });
  const [categoryEditor, setCategoryEditor] = useState<{ open: boolean; category: Category | null }>(
    { open: false, category: null },
  );
  const [confirm, setConfirm] = useState<string | null>(null);
  // A ref, not state: drag handlers must read what is being dragged *now*,
  // never a value captured in an earlier render.
  const dragRef = useRef<Drag>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const byCategory = useMemo(() => groupByCategory(habits), [habits]);

  if (!ready) return <PageSkeleton />;

  const activeCategories = categories.filter((c) => !c.archived);
  const archivedCategories = categories.filter((c) => c.archived);

  const endDrag = () => {
    dragRef.current = null;
    setDropTarget(null);
  };

  const saveHabit = (draft: HabitDraft) => {
    if (habitEditor.habit) updateHabit(habitEditor.habit.id, draft);
    else addHabit(draft);
    setHabitEditor({ open: false, habit: null });
  };

  const saveCategory = (draft: CategoryDraft) => {
    if (categoryEditor.category) updateCategory(categoryEditor.category.id, draft);
    else addCategory(draft);
    setCategoryEditor({ open: false, category: null });
  };

  return (
    <div className="animate-rise space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
            {activeCategories.length}{" "}
            {activeCategories.length === 1 ? "category" : "categories"} ·{" "}
            {habits.filter((h) => !h.archived).length} items
          </p>
          <h1 className="mt-1 text-[34px] font-bold leading-none tracking-[-0.03em] md:text-[42px]">
            Habits
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setCategoryEditor({ open: true, category: null })}>
            <FolderPlus size={16} strokeWidth={2.3} />
            New category
          </Button>
          <Button
            variant="primary"
            onClick={() => setHabitEditor({ open: true, habit: null })}
            disabled={activeCategories.length === 0}
          >
            <Plus size={16} strokeWidth={2.5} />
            New item
          </Button>
        </div>
      </header>

      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Categories organise your life; the items inside them are what actually get tracked. Start with something like Supplements or Activity."
          action={
            <Button variant="primary" onClick={() => setCategoryEditor({ open: true, category: null })}>
              Create your first category
            </Button>
          }
        />
      ) : null}

      <div className="space-y-4">
        {activeCategories.map((category, index) => {
          const items = (byCategory.get(category.id) ?? []).filter((h) => !h.archived);
          const isDropTarget = dropTarget === category.id;

          return (
            <Card
              key={category.id}
              className={[
                "overflow-hidden transition-shadow duration-150",
                isDropTarget ? "ring-2 ring-ink" : "",
              ].join(" ")}
              // Dropping on the card body (not on an item) appends to the end,
              // which is also how you move an item into an empty category.
              onDragOver={(event: React.DragEvent) => {
                if (dragRef.current?.kind !== "habit") return;
                event.preventDefault();
                setDropTarget(category.id);
              }}
              onDrop={(event: React.DragEvent) => {
                const dragged = dragRef.current;
                if (dragged?.kind !== "habit") return;
                event.preventDefault();
                reorderHabit(dragged.id, category.id, null);
                endDrag();
              }}
            >
              <div
                draggable
                onDragStart={() => (dragRef.current = { kind: "category", id: category.id })}
                onDragEnd={endDrag}
                onDragOver={(event) => {
                  if (dragRef.current?.kind !== "category") return;
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  const dragged = dragRef.current;
                  if (dragged?.kind !== "category") return;
                  event.preventDefault();
                  event.stopPropagation();
                  reorderCategory(dragged.id, category.id);
                  endDrag();
                }}
                className="flex items-center gap-2 border-b border-line px-3.5 py-3"
              >
                <GripVertical
                  size={15}
                  className="shrink-0 cursor-grab text-ink-muted active:cursor-grabbing"
                  aria-hidden
                />

                <button
                  type="button"
                  onClick={() => toggleCollapsed(category.id)}
                  aria-expanded={!category.collapsed}
                  aria-label={`${category.collapsed ? "Expand" : "Collapse"} ${category.name}`}
                  className="grid size-6 shrink-0 place-items-center rounded text-ink-muted transition-colors hover:text-ink"
                >
                  <ChevronDown
                    size={15}
                    strokeWidth={2.6}
                    className={category.collapsed ? "-rotate-90 transition-transform" : "transition-transform"}
                  />
                </button>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold uppercase tracking-[0.1em]">
                    {category.name}
                  </p>
                  <p className="truncate text-[11.5px] text-ink-muted">
                    {describeGoal(category, items.length)} · {items.length}{" "}
                    {items.length === 1 ? "item" : "items"}
                  </p>
                </div>

                {/* Arrows stay alongside drag-and-drop: dragging isn't
                    available on touch, and this page must work on a phone. */}
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => moveCategory(category.id, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${category.name} up`}
                    className="grid size-5 place-items-center rounded text-ink-muted transition-colors hover:text-ink disabled:opacity-25"
                  >
                    <ChevronUp size={13} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCategory(category.id, 1)}
                    disabled={index === activeCategories.length - 1}
                    aria-label={`Move ${category.name} down`}
                    className="grid size-5 place-items-center rounded text-ink-muted transition-colors hover:text-ink disabled:opacity-25"
                  >
                    <ChevronDown size={13} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <IconButton
                    label={`Add item to ${category.name}`}
                    onClick={() =>
                      setHabitEditor({ open: true, habit: null, categoryId: category.id })
                    }
                  >
                    <Plus size={15} />
                  </IconButton>
                  <IconButton
                    label={`Edit ${category.name}`}
                    onClick={() => setCategoryEditor({ open: true, category })}
                  >
                    <Pencil size={14} />
                  </IconButton>
                  <IconButton
                    label={`Archive ${category.name}`}
                    onClick={() => setCategoryArchived(category.id, true)}
                  >
                    <Archive size={14} />
                  </IconButton>
                  <IconButton
                    label={`Delete ${category.name}`}
                    onClick={() => setConfirm(confirm === category.id ? null : category.id)}
                    danger
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </div>

              {confirm === category.id ? (
                <div className="animate-rise flex flex-wrap items-center gap-2 bg-sunken px-3.5 py-2.5">
                  <p className="flex-1 text-[12.5px] text-ink-soft">
                    Delete <strong className="font-semibold">{category.name}</strong>, its{" "}
                    {items.length} {items.length === 1 ? "item" : "items"} and all of their history?
                  </p>
                  <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      deleteCategory(category.id);
                      setConfirm(null);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ) : null}

              {!category.collapsed ? (
                <div className="space-y-1.5 p-2.5">
                  {items.length === 0 ? (
                    <p className="px-1.5 py-3 text-center text-[12.5px] text-ink-muted">
                      No items yet — add one, or drag an item here.
                    </p>
                  ) : (
                    items.map((habit, itemIndex) => (
                      <ItemRow
                        key={habit.id}
                        habit={habit}
                        isFirst={itemIndex === 0}
                        isLast={itemIndex === items.length - 1}
                        confirming={confirm === habit.id}
                        isDropTarget={dropTarget === habit.id}
                        onDragStart={() => (dragRef.current = { kind: "habit", id: habit.id })}
                        onDragEnd={endDrag}
                        onDragOver={(event) => {
                          if (dragRef.current?.kind !== "habit") return;
                          event.preventDefault();
                          event.stopPropagation();
                          setDropTarget(habit.id);
                        }}
                        onDrop={(event) => {
                          const dragged = dragRef.current;
                          if (dragged?.kind !== "habit") return;
                          event.preventDefault();
                          event.stopPropagation();
                          reorderHabit(dragged.id, habit.categoryId, habit.id);
                          endDrag();
                        }}
                        onEdit={() => setHabitEditor({ open: true, habit })}
                        onMove={(direction) => moveHabit(habit.id, direction)}
                        onArchive={() => setArchived(habit.id, true)}
                        onDeleteRequest={() =>
                          setConfirm(confirm === habit.id ? null : habit.id)
                        }
                        onDeleteConfirm={() => {
                          deleteHabit(habit.id);
                          setConfirm(null);
                        }}
                      />
                    ))
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      <ArchivedSection
        categories={archivedCategories}
        archivedHabits={habits.filter(
          (h) => h.archived && !archivedCategories.some((c) => c.id === h.categoryId),
        )}
        byCategory={byCategory}
        onRestoreCategory={(id) => setCategoryArchived(id, false)}
        onDeleteCategory={deleteCategory}
        onRestoreHabit={(id) => setArchived(id, false)}
        onDeleteHabit={deleteHabit}
      />

      <HabitEditor
        open={habitEditor.open}
        habit={habitEditor.habit}
        categories={activeCategories}
        defaultCategoryId={habitEditor.categoryId}
        weekStartsOn={settings.weekStartsOn}
        onClose={() => setHabitEditor({ open: false, habit: null })}
        onSave={saveHabit}
      />

      <CategoryEditor
        open={categoryEditor.open}
        category={categoryEditor.category}
        itemCount={
          categoryEditor.category
            ? (byCategory.get(categoryEditor.category.id) ?? []).length
            : 0
        }
        onClose={() => setCategoryEditor({ open: false, category: null })}
        onSave={saveCategory}
      />
    </div>
  );
}

function ItemRow({
  habit,
  isFirst,
  isLast,
  confirming,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onEdit,
  onMove,
  onArchive,
  onDeleteRequest,
  onDeleteConfirm,
}: {
  habit: Habit;
  isFirst: boolean;
  isLast: boolean;
  confirming: boolean;
  isDropTarget: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  onEdit: () => void;
  onMove: (direction: -1 | 1) => void;
  onArchive: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={[
        "rounded-xl border bg-surface px-2.5 py-2 transition-all duration-150",
        isDropTarget ? "border-ink" : "border-transparent hover:border-line",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <GripVertical
          size={14}
          className="shrink-0 cursor-grab text-ink-muted active:cursor-grabbing"
          aria-hidden
        />

        <div className="flex shrink-0 flex-col">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={isFirst}
            aria-label={`Move ${habit.name} up`}
            className="grid size-4 place-items-center rounded text-ink-muted transition-colors hover:text-ink disabled:opacity-25"
          >
            <ChevronUp size={12} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={isLast}
            aria-label={`Move ${habit.name} down`}
            className="grid size-4 place-items-center rounded text-ink-muted transition-colors hover:text-ink disabled:opacity-25"
          >
            <ChevronDown size={12} strokeWidth={2.5} />
          </button>
        </div>

        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-xl text-[16px]"
          style={{ background: withAlpha(habit.color, 0.16) }}
        >
          {habit.emoji}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold tracking-tight">{habit.name}</p>
          <p className="flex items-center gap-1.5 text-[11.5px] text-ink-muted">
            <span className="size-2 rounded-[2px]" style={{ background: habit.color }} />
            {describeSchedule(habit.schedule)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton label={`Edit ${habit.name}`} onClick={onEdit}>
            <Pencil size={14} />
          </IconButton>
          <IconButton label={`Archive ${habit.name}`} onClick={onArchive}>
            <Archive size={14} />
          </IconButton>
          <IconButton label={`Delete ${habit.name}`} onClick={onDeleteRequest} danger>
            <Trash2 size={14} />
          </IconButton>
        </div>
      </div>

      {confirming ? (
        <div className="animate-rise mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-sunken px-2.5 py-2">
          <p className="flex-1 text-[12px] text-ink-soft">
            Delete <strong className="font-semibold">{habit.name}</strong> and its history?
          </p>
          <Button size="sm" variant="ghost" onClick={onDeleteRequest}>
            Cancel
          </Button>
          <Button size="sm" variant="danger" onClick={onDeleteConfirm}>
            Delete
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ArchivedSection({
  categories,
  archivedHabits,
  byCategory,
  onRestoreCategory,
  onDeleteCategory,
  onRestoreHabit,
  onDeleteHabit,
}: {
  categories: Category[];
  archivedHabits: Habit[];
  byCategory: Map<string, Habit[]>;
  onRestoreCategory: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  onRestoreHabit: (id: string) => void;
  onDeleteHabit: (id: string) => void;
}) {
  if (categories.length === 0 && archivedHabits.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <SectionLabel>Archived</SectionLabel>

      {categories.map((category) => {
        const count = (byCategory.get(category.id) ?? []).length;
        return (
          <Card key={category.id} className="flex items-center gap-3 p-3.5 opacity-70">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold uppercase tracking-[0.1em]">
                {category.name}
              </p>
              <p className="text-[11.5px] text-ink-muted">
                {count} {count === 1 ? "item" : "items"} · archived
              </p>
            </div>
            <Button size="sm" onClick={() => onRestoreCategory(category.id)}>
              <ArchiveRestore size={14} />
              Restore
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => onDeleteCategory(category.id)}
              aria-label={`Delete ${category.name}`}
            >
              <Trash2 size={14} />
            </Button>
          </Card>
        );
      })}

      {archivedHabits.map((habit) => (
        <Card key={habit.id} className="flex items-center gap-3 p-3.5 opacity-70">
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-xl text-[16px]"
            style={{ background: withAlpha(habit.color, 0.15) }}
          >
            {habit.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold tracking-tight">{habit.name}</p>
            <p className="text-[11.5px] text-ink-muted">
              {describeSchedule(habit.schedule)} · archived
            </p>
          </div>
          <Button size="sm" onClick={() => onRestoreHabit(habit.id)}>
            <ArchiveRestore size={14} />
            Restore
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => onDeleteHabit(habit.id)}
            aria-label={`Delete ${habit.name}`}
          >
            <Trash2 size={14} />
          </Button>
        </Card>
      ))}
    </section>
  );
}

function IconButton({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        "grid size-8 place-items-center rounded-lg transition-colors duration-150",
        danger
          ? "text-ink-muted hover:bg-[#E5484D]/12 hover:text-[#D3383D]"
          : "text-ink-muted hover:bg-sunken hover:text-ink",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
