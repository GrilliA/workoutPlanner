import type { ListedMealTag } from "@api";
import type { SelectOption } from "@components/select";

/** A meal of a plan or of a template: the tag it uses and the name saved with it. */
type NamedTagMeal = { tagId: number; name: string };

/**
 * The name of a tag, live or archived. A tag that the lists do not hold keeps the name its
 * plan or template saved; "Pasto" is the last resort.
 */
export function tagNameOf(
  tagId: number,
  knownTags: ListedMealTag[],
  savedMeals: NamedTagMeal[],
): string {
  const knownTag = knownTags.find((tag) => tag.id === tagId);
  const savedMeal = savedMeals.find((meal) => meal.tagId === tagId);

  return knownTag?.name ?? savedMeal?.name ?? "Pasto";
}

/** How an archived tag reads where it is still shown: "Merenda · archiviato". */
export const archivedTagLabel = (name: string): string => `${name} · archiviato`;

/** The tags to pick from, plus the meal's own tag when it is archived (shown, not offered again). */
export function tagOptionsFor(
  liveTags: ListedMealTag[],
  mealTagId: number,
  mealTagName: string,
): SelectOption[] {
  const liveOptions = liveTags.map((tag) => ({ value: String(tag.id), label: tag.name }));
  const isArchived = !liveTags.some((tag) => tag.id === mealTagId);

  if (!isArchived) {
    return liveOptions;
  }

  return [...liveOptions, { value: String(mealTagId), label: archivedTagLabel(mealTagName) }];
}

type SkippedTags = {
  skippedCount: number;
  /** Names of the archived tags, once each. */
  skippedTagNames: string[];
};

/** The template meals that applying skips (their tag is not live), counted and named. */
export function skippedTagsOf(meals: NamedTagMeal[], liveTagIds: number[]): SkippedTags {
  const skippedMeals = meals.filter((meal) => !liveTagIds.includes(meal.tagId));
  const skippedTagNames = skippedMeals
    .map((meal) => meal.name)
    .filter((name, index, names) => names.indexOf(name) === index);

  return { skippedCount: skippedMeals.length, skippedTagNames };
}
