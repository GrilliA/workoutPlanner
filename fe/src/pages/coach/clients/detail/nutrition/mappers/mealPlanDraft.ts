import type { MealPlan, MealPlanInput, MealPlanTemplate } from "@api";
import { moveItemTo } from "@utils/moveItemTo";

// Limits from the contract (docs/contracts/al-piano-pasti.md, Limiti).
export const MAX_MEALS = 12;
export const MAX_ITEMS_PER_MEAL = 30;
export const MAX_FOOD_LENGTH = 120;
export const MAX_QUANTITY_LENGTH = 60;
export const MAX_PLAN_NOTES_LENGTH = 1000;

export type DraftItem = {
  /** React key: stable while the coach edits, also for rows the server has not seen. */
  key: string;
  id?: number;
  food: string;
  quantity: string;
};

export type DraftMeal = {
  key: string;
  id?: number;
  tagId: number;
  /** "HH:MM" or "" for no time. */
  timeOfDay: string;
  /** Not edited here (AL3 design): kept so a save does not wipe them. */
  notes: string | null;
  items: DraftItem[];
};

export type MealPlanDraft = {
  notes: string;
  meals: DraftMeal[];
};

type CreateKey = () => string;

export function draftFromPlan(plan: MealPlan | null, createKey: CreateKey): MealPlanDraft {
  if (plan === null) {
    return { notes: "", meals: [] };
  }

  return {
    notes: plan.notes ?? "",
    meals: plan.meals.map((meal) => ({
      key: createKey(),
      id: meal.id,
      tagId: meal.tagId,
      timeOfDay: meal.timeOfDay ?? "",
      notes: meal.notes,
      items: meal.items.map((item) => ({
        key: createKey(),
        id: item.id,
        food: item.food,
        quantity: item.quantity ?? "",
      })),
    })),
  };
}

const textOrNull = (text: string): string | null => {
  const trimmed = text.trim();
  return trimmed === "" ? null : trimmed;
};

/** The PUT body: the whole plan, in the order on screen. */
export function mealPlanInputFrom(draft: MealPlanDraft): MealPlanInput {
  return {
    notes: textOrNull(draft.notes),
    meals: draft.meals.map((meal) => ({
      id: meal.id,
      tagId: meal.tagId,
      timeOfDay: textOrNull(meal.timeOfDay),
      notes: meal.notes,
      items: meal.items.map((item) => ({
        id: item.id,
        food: item.food.trim(),
        quantity: textOrNull(item.quantity),
      })),
    })),
  };
}

/** Compares what a save would send, so typing and undoing a change is not "unsaved". */
export function isDraftChanged(draft: MealPlanDraft, saved: MealPlanDraft): boolean {
  return JSON.stringify(mealPlanInputFrom(draft)) !== JSON.stringify(mealPlanInputFrom(saved));
}

const updateMeal = (
  draft: MealPlanDraft,
  mealKey: string,
  update: (meal: DraftMeal) => DraftMeal,
): MealPlanDraft => ({
  ...draft,
  meals: draft.meals.map((meal) => (meal.key === mealKey ? update(meal) : meal)),
});

export function addMeal(draft: MealPlanDraft, tagId: number, createKey: CreateKey): MealPlanDraft {
  const meal: DraftMeal = { key: createKey(), tagId, timeOfDay: "", notes: null, items: [] };
  return { ...draft, meals: [...draft.meals, meal] };
}

export function removeMeal(draft: MealPlanDraft, mealKey: string): MealPlanDraft {
  return { ...draft, meals: draft.meals.filter((meal) => meal.key !== mealKey) };
}

export function moveMeal(draft: MealPlanDraft, fromIndex: number, toIndex: number): MealPlanDraft {
  return { ...draft, meals: moveItemTo(draft.meals, fromIndex, toIndex) };
}

export function changeMealTag(draft: MealPlanDraft, mealKey: string, tagId: number): MealPlanDraft {
  return updateMeal(draft, mealKey, (meal) => ({ ...meal, tagId }));
}

export function changeMealTime(
  draft: MealPlanDraft,
  mealKey: string,
  timeOfDay: string,
): MealPlanDraft {
  return updateMeal(draft, mealKey, (meal) => ({ ...meal, timeOfDay }));
}

export function addItem(draft: MealPlanDraft, mealKey: string, createKey: CreateKey): MealPlanDraft {
  const item: DraftItem = { key: createKey(), food: "", quantity: "" };
  return updateMeal(draft, mealKey, (meal) => ({ ...meal, items: [...meal.items, item] }));
}

export function removeItem(draft: MealPlanDraft, mealKey: string, itemKey: string): MealPlanDraft {
  return updateMeal(draft, mealKey, (meal) => ({
    ...meal,
    items: meal.items.filter((item) => item.key !== itemKey),
  }));
}

export function changeItem(
  draft: MealPlanDraft,
  mealKey: string,
  itemKey: string,
  changes: Partial<Pick<DraftItem, "food" | "quantity">>,
): MealPlanDraft {
  return updateMeal(draft, mealKey, (meal) => ({
    ...meal,
    items: meal.items.map((item) => (item.key === itemKey ? { ...item, ...changes } : item)),
  }));
}

export type AppliedTemplate = {
  draft: MealPlanDraft;
  skippedCount: number;
  /** Names of the archived tags whose meals were skipped, once each. */
  skippedTagNames: string[];
};

/**
 * Replaces the meals with the template's (tag and time, no foods), keeping the plan notes.
 * Meals whose tag is archived (not among `liveTagIds`) are skipped: the API would refuse
 * them on a new meal (contract, Template di giornata).
 */
export function applyTemplate(
  draft: MealPlanDraft,
  template: MealPlanTemplate,
  liveTagIds: number[],
  createKey: CreateKey,
): AppliedTemplate {
  const isLive = (tagId: number) => liveTagIds.includes(tagId);
  const keptMeals = template.meals.filter((meal) => isLive(meal.tagId));
  const skippedMeals = template.meals.filter((meal) => !isLive(meal.tagId));
  const skippedTagNames = skippedMeals
    .map((meal) => meal.name)
    .filter((name, index, names) => names.indexOf(name) === index);

  const meals: DraftMeal[] = keptMeals.map((meal) => ({
    key: createKey(),
    tagId: meal.tagId,
    timeOfDay: meal.timeOfDay ?? "",
    notes: null,
    items: [],
  }));

  return {
    draft: { ...draft, meals },
    skippedCount: skippedMeals.length,
    skippedTagNames,
  };
}
