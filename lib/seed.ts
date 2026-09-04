import type { AppData, Category, Habit } from "@/types";
import { DEFAULT_SETTINGS, SCHEMA_VERSION, createId } from "./normalize";

interface SeedItem {
  name: string;
  emoji: string;
  color: string;
  schedule?: Habit["schedule"];
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
 *
 * This seeds STRUCTURE ONLY. No completion history is ever generated — the
 * year grid is meant to fill in from real use, and a number on this screen
 * should always mean something actually happened.
 */
const SEED_GROUPS: SeedGroup[] = [
  {
    name: "Supplements",
    goalType: "all",
    items: [
      { name: "Vitamin C", emoji: "💊", color: "#F5B814" },
      { name: "Vitamin B", emoji: "💊", color: "#F97316" },
      { name: "Magnesium", emoji: "💊", color: "#C05BE0" },
      { name: "Zinc", emoji: "💊", color: "#EC5A8D" },
      { name: "Creatine", emoji: "⚡", color: "#8B5CF6" },
    ],
  },
  {
    name: "Activity",
    goalType: "any",
    items: [
      { name: "Run", emoji: "🏃", color: "#12A594" },
      { name: "Basketball", emoji: "🏀", color: "#0FB0C4" },
      { name: "Gym", emoji: "🏋️", color: "#3B9EF5" },
    ],
  },
  {
    name: "Other",
    goalType: "all",
    items: [
      { name: "Read", emoji: "📖", color: "#5B6BF0" },
      { name: "Water", emoji: "💧", color: "#4DA167" },
    ],
  },
];

export function createSeedStructure(): { categories: Category[]; habits: Habit[] } {
  const createdAt = new Date().toISOString();
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

/**
 * The full first-launch snapshot: the starting structure, no history.
 *
 * `completions` is deliberately empty. A fresh install starts at zero and
 * every cell that gains colour from here on represents something real.
 */
export function createSeedData(): AppData {
  const { categories, habits } = createSeedStructure();
  return {
    version: SCHEMA_VERSION,
    categories,
    habits,
    completions: {},
    sickDays: [],
    notes: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}
