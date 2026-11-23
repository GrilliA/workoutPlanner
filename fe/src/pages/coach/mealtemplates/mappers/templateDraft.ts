import type { MealPlanTemplate, MealPlanTemplateInput } from "@api";
import { moveItemTo } from "@utils/moveItemTo";

// Limits from the contract (docs/contracts/al-piano-pasti.md, Limiti).
export const MAX_TEMPLATES = 20;
export const MAX_TEMPLATE_MEALS = 12;
export const MAX_TEMPLATE_NAME_LENGTH = 60;

export type TemplateDraftMeal = {
  /** React key: template meals have no id. */
  key: string;
  tagId: number;
  /** "HH:MM" or "" for no time. */
  timeOfDay: string;
};

export type TemplateDraft = {
  name: string;
  meals: TemplateDraftMeal[];
};

/** A saved template as a draft, or an empty one for a new template. Keys follow the order. */
export function templateDraftFrom(template: MealPlanTemplate | null): TemplateDraft {
  if (template === null) {
    return { name: "", meals: [] };
  }

  return {
    name: template.name,
    meals: template.meals.map((meal, index) => ({
      key: `saved-${index}`,
      tagId: meal.tagId,
      timeOfDay: meal.timeOfDay ?? "",
    })),
  };
}

export function templateInputFrom(draft: TemplateDraft): MealPlanTemplateInput {
  return {
    name: draft.name.trim(),
    meals: draft.meals.map((meal) => ({
      tagId: meal.tagId,
      timeOfDay: meal.timeOfDay === "" ? null : meal.timeOfDay,
    })),
  };
}

/** Why a template is not saved: it has no name, or no meal. */
export type TemplateProblem = { kind: "no-name" } | { kind: "no-meals" };

/** The first thing to fix before the template can be saved, or null. A new object each time. */
export function findTemplateProblem(draft: TemplateDraft): TemplateProblem | null {
  if (draft.name.trim() === "") {
    return { kind: "no-name" };
  }

  return draft.meals.length === 0 ? { kind: "no-meals" } : null;
}

export function isTemplateDraftChanged(draft: TemplateDraft, saved: TemplateDraft): boolean {
  return JSON.stringify(templateInputFrom(draft)) !== JSON.stringify(templateInputFrom(saved));
}

export function addTemplateMeal(draft: TemplateDraft, tagId: number, key: string): TemplateDraft {
  return { ...draft, meals: [...draft.meals, { key, tagId, timeOfDay: "" }] };
}

export function removeTemplateMeal(draft: TemplateDraft, mealKey: string): TemplateDraft {
  return { ...draft, meals: draft.meals.filter((meal) => meal.key !== mealKey) };
}

export function moveTemplateMeal(
  draft: TemplateDraft,
  fromIndex: number,
  toIndex: number,
): TemplateDraft {
  return { ...draft, meals: moveItemTo(draft.meals, fromIndex, toIndex) };
}

export function changeTemplateMeal(
  draft: TemplateDraft,
  mealKey: string,
  changes: Partial<Pick<TemplateDraftMeal, "tagId" | "timeOfDay">>,
): TemplateDraft {
  return {
    ...draft,
    meals: draft.meals.map((meal) => (meal.key === mealKey ? { ...meal, ...changes } : meal)),
  };
}
