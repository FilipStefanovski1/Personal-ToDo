import type { AppData, Category, CompletionMap, Habit } from "@/types";
import { DEFAULT_SETTINGS, SCHEMA_VERSION, createId } from "./normalize";
import { getWeekday, shiftKey, todayKey } from "./dates";
import { isHabitDueOn } from "./schedule";

interface SeedItem {
  name: string;
  emoji: string;
  color: string;
  schedule?: Habit["schedule"];
  /** Rough share of due days completed, used only for the demo history. */
  rate: number;
}

interface SeedGroup {
  name: string;
  goalType: Category["goalType"];
  goalTarget?: number;
  items: SeedItem[];
}

/**
 * First-launch structure: categories organise things, individual items are
 * what actually get tracked. Colours are picked so each group reads as a
 * family (warm supplements, cool activity) rather than a random rainbow.
 */
const SEED_GROUPS: SeedGroup[] = [
  {
    name: "Supplements",
    goalType: "all",
    items: [
      { name: "Vitamin C", emoji: "💊", color: "#F5B814", rate: 0.94 },
      { name: "Vitamin B", emoji: "💊", color: "#F97316", rate: 0.9 },
      { name: "Magnesium", emoji: "💊", color: "#C05BE0", rate: 0.72 },
      { name: "Zinc", emoji: "💊", color: "#EC5A8D", rate: 0.86 },
      { name: "Creatine", emoji: "⚡", color: "#8B5CF6", rate: 0.96 },
    ],
  },
  {
    name: "Activity",
    goalType: "any",
    items: [
      { name: "Run", emoji: "🏃", color: "#12A594", rate: 0.24 },
      { name: "Basketball", emoji: "🏀", color: "#0FB0C4", rate: 0.3 },
      { name: "Gym", emoji: "🏋️", color: "#3B9EF5", rate: 0.46 },
    ],
  },
  {
    name: "Other",
    goalType: "all",
    items: [
      { name: "Read 20 minutes", emoji: "📖", color: "#5B6BF0", rate: 0.78 },
      { name: "Drink enough water", emoji: "💧", color: "#4DA167", rate: 0.85 },
    ],
  },
];

export function createSeedStructure(): { categories: Category[]; habits: Habit[] } {
  const now = new Date();
  // Backdate creation so the seeded history counts toward completion rates.
  const createdAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString();

  const categories: Category[] = [];
  const habits: Habit[] = [];

  SEED_GROUPS.forEach((group, categoryIndex) => {
    const category: Category = {
      id: createId("c"),
      name: group.name,
      order: categoryIndex,
      goalType: group.goalType,
      goalTarget: group.goalTarget ?? 1,
      collapsed: false,
      archived: false,
    };
    categories.push(category);

    group.items.forEach((item, itemIndex) => {
      habits.push({
        id: createId(),
        categoryId: category.id,
        name: item.name,
        emoji: item.emoji,
        color: item.color,
        schedule: item.schedule ?? { type: "daily" },
        order: itemIndex,
        archived: false,
        createdAt,
      });
    });
  });

  return { categories, habits };
}

/** Completion rate per habit id, for shaping believable demo history. */
function seedRates(habits: Habit[]): Map<string, number> {
  const flat = SEED_GROUPS.flatMap((g) => g.items);
  const rates = new Map<string, number>();
  habits.forEach((habit) => {
    rates.set(habit.id, flat.find((i) => i.name === habit.name)?.rate ?? 0.75);
  });
  return rates;
}

/**
 * Plausible-looking history for the last 30 days so the year grid is colourful
 * on first open. Weekends are a little weaker, and activities cluster the way
 * they do in real life rather than firing independently every day.
 */
export function createDemoCompletions(habits: Habit[], days = 30): CompletionMap {
  const completions: CompletionMap = {};
  const today = todayKey();
  const rates = seedRates(habits);

  for (let offset = days; offset >= 0; offset--) {
    const key = shiftKey(today, -offset);
    const weekday = getWeekday(key);
    const isWeekend = weekday === 0 || weekday === 6;
    const done: string[] = [];

    for (const habit of habits) {
      if (!isHabitDueOn(habit, key)) continue;
      const base = rates.get(habit.id) ?? 0.75;
      const rate = isWeekend ? base * 0.85 : base;
      if (Math.random() < rate) done.push(habit.id);
    }

    if (done.length > 0) completions[key] = done;
  }

  return completions;
}

/** The full first-launch snapshot: seed structure + demo history + defaults. */
export function createSeedData(): AppData {
  const { categories, habits } = createSeedStructure();
  return {
    version: SCHEMA_VERSION,
    categories,
    habits,
    completions: createDemoCompletions(habits),
    settings: { ...DEFAULT_SETTINGS },
  };
}
