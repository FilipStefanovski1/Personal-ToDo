"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MAX_NOTE_LENGTH } from "@/types";
import type {
  AppData,
  AppSettings,
  Category,
  DateKey,
  GoalType,
  Habit,
  HabitSchedule,
} from "@/types";
import { getStorageProvider } from "@/storage";
import { DEFAULT_SETTINGS, SCHEMA_VERSION, createId, normalizeAppData } from "./normalize";
import { createSeedData } from "./seed";
import { isFuture } from "./dates";
import { DEFAULT_COLOR } from "./colors";

export interface NewHabitInput {
  categoryId: string;
  name: string;
  emoji: string;
  color: string;
  schedule: HabitSchedule;
}

export interface NewCategoryInput {
  name: string;
  goalType: GoalType;
  goalTarget: number;
}

interface StoreValue {
  /** False until the persisted snapshot has been read. */
  ready: boolean;
  data: AppData;
  categories: Category[];
  /** Non-archived categories, in display order. */
  activeCategories: Category[];
  habits: Habit[];
  /** Non-archived habits in non-archived categories, in display order. */
  activeHabits: Habit[];
  /** Habits belonging to a category, in order (includes archived). */
  habitsIn: (categoryId: string) => Habit[];
  settings: AppSettings;

  isCompleted: (habitId: string, date: DateKey) => boolean;
  completionsOn: (date: DateKey) => string[];
  toggleCompletion: (habitId: string, date: DateKey) => void;
  setCompletion: (habitId: string, date: DateKey, done: boolean) => void;

  /** All marked sick days, for passing into the stats functions. */
  sickDaySet: ReadonlySet<DateKey>;
  noteOn: (date: DateKey) => string;
  setNote: (date: DateKey, text: string) => void;
  isSickDay: (date: DateKey) => boolean;
  setSickDay: (date: DateKey, sick: boolean) => void;
  toggleSickDay: (date: DateKey) => void;

  addCategory: (input: NewCategoryInput) => Category;
  updateCategory: (id: string, patch: Partial<Omit<Category, "id">>) => void;
  /** Removes the category, its habits, and their history. */
  deleteCategory: (id: string) => void;
  setCategoryArchived: (id: string, archived: boolean) => void;
  toggleCollapsed: (id: string) => void;
  moveCategory: (id: string, direction: -1 | 1) => void;
  /** Drag-and-drop: place `draggedId` at the position of `targetId`. */
  reorderCategory: (draggedId: string, targetId: string) => void;

  addHabit: (input: NewHabitInput) => Habit;
  updateHabit: (id: string, patch: Partial<Omit<Habit, "id">>) => void;
  deleteHabit: (id: string) => void;
  setArchived: (id: string, archived: boolean) => void;
  moveHabit: (id: string, direction: -1 | 1) => void;
  /**
   * Drag-and-drop: move a habit to `categoryId`, landing before `targetId`
   * (or at the end when `targetId` is null).
   */
  reorderHabit: (draggedId: string, categoryId: string, targetId: string | null) => void;

  updateSettings: (patch: Partial<AppSettings>) => void;

  replaceAll: (data: AppData) => void;
  resetAll: () => void;
  /** Wipes completion history, keeping categories and items. */
  clearHistory: () => void;
}

const EMPTY_DATA: AppData = {
  version: SCHEMA_VERSION,
  categories: [],
  habits: [],
  completions: {},
  sickDays: [],
  notes: {},
  settings: { ...DEFAULT_SETTINGS },
};

const StoreContext = createContext<StoreValue | null>(null);

/** Re-packs `order` to 0..n-1 independently inside each category. */
function renumberWithinCategories(habits: Habit[]): Habit[] {
  const counters = new Map<string, number>();
  return [...habits]
    .sort((a, b) => a.order - b.order)
    .map((habit) => {
      const next = counters.get(habit.categoryId) ?? 0;
      counters.set(habit.categoryId, next + 1);
      return { ...habit, order: next };
    });
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const providerRef = useRef(getStorageProvider());
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [ready, setReady] = useState(false);

  // Hydrate once on mount. Seed data only ever appears on a genuinely empty
  // install, so a user who deletes every habit doesn't get them back.
  useEffect(() => {
    let cancelled = false;
    providerRef.current.load().then((loaded) => {
      if (cancelled) return;
      setData(loaded ?? createSeedData());
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Write-through persistence, debounced so a burst of taps is one write.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void providerRef.current.save(data);
    }, 150);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data, ready]);

  const completionIndex = useMemo(() => {
    const index = new Map<DateKey, Set<string>>();
    for (const [date, ids] of Object.entries(data.completions)) {
      index.set(date, new Set(ids));
    }
    return index;
  }, [data.completions]);

  const isCompleted = useCallback(
    (habitId: string, date: DateKey) => completionIndex.get(date)?.has(habitId) ?? false,
    [completionIndex],
  );

  const completionsOn = useCallback(
    (date: DateKey) => data.completions[date] ?? [],
    [data.completions],
  );

  const setCompletion = useCallback((habitId: string, date: DateKey, done: boolean) => {
    // Guard rail: the future can't have been completed yet.
    if (isFuture(date)) return;
    setData((prev) => {
      const existing = prev.completions[date] ?? [];
      const has = existing.includes(habitId);
      if (has === done) return prev;

      const next = { ...prev.completions };
      if (done) {
        next[date] = [...existing, habitId];
      } else {
        const remaining = existing.filter((id) => id !== habitId);
        if (remaining.length > 0) next[date] = remaining;
        else delete next[date];
      }
      return { ...prev, completions: next };
    });
  }, []);

  const toggleCompletion = useCallback(
    (habitId: string, date: DateKey) => {
      setCompletion(habitId, date, !isCompleted(habitId, date));
    },
    [isCompleted, setCompletion],
  );

  const noteOn = useCallback((date: DateKey) => data.notes[date] ?? "", [data.notes]);

  const setNote = useCallback((date: DateKey, text: string) => {
    if (isFuture(date)) return;
    const trimmed = text.trim().slice(0, MAX_NOTE_LENGTH);
    setData((prev) => {
      if ((prev.notes[date] ?? "") === trimmed) return prev;
      const notes = { ...prev.notes };
      // An emptied note is a deletion, not an empty string on the record.
      if (trimmed) notes[date] = trimmed;
      else delete notes[date];
      return { ...prev, notes };
    });
  }, []);

  const sickDaySet = useMemo(() => new Set(data.sickDays), [data.sickDays]);

  const isSickDay = useCallback((date: DateKey) => sickDaySet.has(date), [sickDaySet]);

  const setSickDay = useCallback((date: DateKey, sick: boolean) => {
    // Same guard rail as completions: the future can't have happened yet.
    if (isFuture(date)) return;
    setData((prev) => {
      const has = prev.sickDays.includes(date);
      if (has === sick) return prev;
      return {
        ...prev,
        sickDays: sick
          ? [...prev.sickDays, date].sort()
          : prev.sickDays.filter((d) => d !== date),
      };
    });
  }, []);

  const toggleSickDay = useCallback(
    (date: DateKey) => setSickDay(date, !isSickDay(date)),
    [isSickDay, setSickDay],
  );

  const addCategory = useCallback((input: NewCategoryInput): Category => {
    const category: Category = {
      id: createId("c"),
      name: input.name.trim() || "Untitled category",
      order: 0,
      goalType: input.goalType,
      goalTarget: Math.max(1, input.goalTarget),
      collapsed: false,
      archived: false,
    };
    setData((prev) => ({
      ...prev,
      categories: [...prev.categories, { ...category, order: prev.categories.length }],
    }));
    return category;
  }, []);

  const updateCategory = useCallback((id: string, patch: Partial<Omit<Category, "id">>) => {
    setData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  /** Deleting a category takes its habits and their history with it. */
  const deleteCategory = useCallback((id: string) => {
    setData((prev) => {
      const doomed = new Set(prev.habits.filter((h) => h.categoryId === id).map((h) => h.id));
      const completions: AppData["completions"] = {};
      for (const [date, ids] of Object.entries(prev.completions)) {
        const remaining = ids.filter((hid) => !doomed.has(hid));
        if (remaining.length > 0) completions[date] = remaining;
      }
      return {
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id).map((c, i) => ({ ...c, order: i })),
        habits: prev.habits.filter((h) => h.categoryId !== id),
        completions,
      };
    });
  }, []);

  const setCategoryArchived = useCallback(
    (id: string, archived: boolean) => updateCategory(id, { archived }),
    [updateCategory],
  );

  const toggleCollapsed = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === id ? { ...c, collapsed: !c.collapsed } : c,
      ),
    }));
  }, []);

  const moveCategory = useCallback((id: string, direction: -1 | 1) => {
    setData((prev) => {
      const sorted = [...prev.categories].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((c) => c.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= sorted.length) return prev;
      [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
      return { ...prev, categories: sorted.map((c, i) => ({ ...c, order: i })) };
    });
  }, []);

  const reorderCategory = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    setData((prev) => {
      const sorted = [...prev.categories].sort((a, b) => a.order - b.order);
      const from = sorted.findIndex((c) => c.id === draggedId);
      const to = sorted.findIndex((c) => c.id === targetId);
      if (from === -1 || to === -1) return prev;
      const [moved] = sorted.splice(from, 1);
      sorted.splice(to, 0, moved);
      return { ...prev, categories: sorted.map((c, i) => ({ ...c, order: i })) };
    });
  }, []);

  const addHabit = useCallback((input: NewHabitInput): Habit => {
    const habit: Habit = {
      id: createId(),
      categoryId: input.categoryId,
      name: input.name.trim() || "Untitled habit",
      emoji: input.emoji || "🎯",
      color: input.color || DEFAULT_COLOR,
      schedule: input.schedule,
      order: 0,
      archived: false,
      createdAt: new Date().toISOString(),
    };
    setData((prev) => {
      // Order is scoped to the category, so append after its current last item.
      const siblings = prev.habits.filter((h) => h.categoryId === input.categoryId);
      return { ...prev, habits: [...prev.habits, { ...habit, order: siblings.length }] };
    });
    return habit;
  }, []);

  const updateHabit = useCallback((id: string, patch: Partial<Omit<Habit, "id">>) => {
    setData((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    }));
  }, []);

  const deleteHabit = useCallback((id: string) => {
    setData((prev) => {
      const completions: AppData["completions"] = {};
      for (const [date, ids] of Object.entries(prev.completions)) {
        const remaining = ids.filter((hid) => hid !== id);
        if (remaining.length > 0) completions[date] = remaining;
      }
      const remaining = prev.habits.filter((h) => h.id !== id);
      return { ...prev, habits: renumberWithinCategories(remaining), completions };
    });
  }, []);

  const setArchived = useCallback(
    (id: string, archived: boolean) => updateHabit(id, { archived }),
    [updateHabit],
  );

  /** Moves within the habit's own category; it never hops groups by arrow. */
  const moveHabit = useCallback((id: string, direction: -1 | 1) => {
    setData((prev) => {
      const habit = prev.habits.find((h) => h.id === id);
      if (!habit) return prev;
      const siblings = prev.habits
        .filter((h) => h.categoryId === habit.categoryId)
        .sort((a, b) => a.order - b.order);
      const index = siblings.findIndex((h) => h.id === id);
      const target = index + direction;
      if (target < 0 || target >= siblings.length) return prev;
      [siblings[index], siblings[target]] = [siblings[target], siblings[index]];

      const reordered = new Map(siblings.map((h, i) => [h.id, i]));
      return {
        ...prev,
        habits: prev.habits.map((h) =>
          reordered.has(h.id) ? { ...h, order: reordered.get(h.id)! } : h,
        ),
      };
    });
  }, []);

  const reorderHabit = useCallback(
    (draggedId: string, categoryId: string, targetId: string | null) => {
      if (draggedId === targetId) return;
      setData((prev) => {
        const dragged = prev.habits.find((h) => h.id === draggedId);
        if (!dragged) return prev;

        const others = prev.habits.filter((h) => h.id !== draggedId);
        const destination = others
          .filter((h) => h.categoryId === categoryId)
          .sort((a, b) => a.order - b.order);

        const insertAt = targetId
          ? destination.findIndex((h) => h.id === targetId)
          : destination.length;
        destination.splice(insertAt === -1 ? destination.length : insertAt, 0, {
          ...dragged,
          categoryId,
        });

        const rest = others.filter((h) => h.categoryId !== categoryId);
        return {
          ...prev,
          habits: [...rest, ...destination.map((h, i) => ({ ...h, order: i }))],
        };
      });
    },
    [],
  );

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const replaceAll = useCallback((next: AppData) => {
    setData(normalizeAppData(next));
  }, []);

  const resetAll = useCallback(() => {
    setData({ ...EMPTY_DATA, settings: { ...DEFAULT_SETTINGS } });
    void providerRef.current.clear();
  }, []);

  /** Wipes history but keeps the categories and items themselves. */
  const clearHistory = useCallback(() => {
    setData((prev) => ({ ...prev, completions: {}, sickDays: [], notes: {} }));
  }, []);

  const categories = useMemo(
    () => [...data.categories].sort((a, b) => a.order - b.order),
    [data.categories],
  );
  const activeCategories = useMemo(() => categories.filter((c) => !c.archived), [categories]);

  /** Habits sorted by category order first, then by their order within it. */
  const habits = useMemo(() => {
    const rank = new Map(categories.map((c, i) => [c.id, i]));
    return [...data.habits].sort((a, b) => {
      const byCategory = (rank.get(a.categoryId) ?? 0) - (rank.get(b.categoryId) ?? 0);
      return byCategory !== 0 ? byCategory : a.order - b.order;
    });
  }, [data.habits, categories]);

  const activeHabits = useMemo(() => {
    const live = new Set(activeCategories.map((c) => c.id));
    return habits.filter((h) => !h.archived && live.has(h.categoryId));
  }, [habits, activeCategories]);

  const habitsIn = useCallback(
    (categoryId: string) => habits.filter((h) => h.categoryId === categoryId),
    [habits],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      data,
      categories,
      activeCategories,
      habits,
      activeHabits,
      habitsIn,
      settings: data.settings,
      isCompleted,
      completionsOn,
      toggleCompletion,
      setCompletion,
      sickDaySet,
      noteOn,
      setNote,
      isSickDay,
      setSickDay,
      toggleSickDay,
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
      updateSettings,
      replaceAll,
      resetAll,
      clearHistory,
    }),
    [
      ready, data, categories, activeCategories, habits, activeHabits, habitsIn,
      isCompleted, completionsOn, toggleCompletion, setCompletion,
      sickDaySet, noteOn, setNote, isSickDay, setSickDay, toggleSickDay,
      addCategory, updateCategory, deleteCategory, setCategoryArchived, toggleCollapsed,
      moveCategory, reorderCategory,
      addHabit, updateHabit, deleteHabit, setArchived, moveHabit, reorderHabit,
      updateSettings, replaceAll, resetAll, clearHistory,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
