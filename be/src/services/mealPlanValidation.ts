import { isValidIsoDate } from "./assignmentStatus";
import { daysBetween } from "./subscription";
import { isDatabaseId } from "./subscriptionValidation";

type Invalid = { ok: false; error: string };
type Valid<T> = { ok: true; value: T };
type Parse<T> = (value: unknown) => Valid<T> | Invalid;

// Safety caps, not product rules: a real day has a handful of meals with a few foods each.
// They stop a broken or hostile client from storing plans the panel and the app cannot show.
const MAX_MEALS_PER_PLAN = 12;
const MAX_ITEMS_PER_MEAL = 30;
const MAX_MEAL_NAME_LENGTH = 60;
const MAX_FOOD_LENGTH = 120;
const MAX_QUANTITY_LENGTH = 60;
const MAX_MEAL_PLAN_NOTES_LENGTH = 1000;
const MAX_MEAL_NOTES_LENGTH = 500;
const MAX_MEAL_LOG_RANGE_DAYS = 31;
const EARLIEST_DATE = "2000-01-01";
const LATEST_DATE = "2099-12-31";
const TIME_OF_DAY_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

const INVALID_BODY: Invalid = { ok: false, error: "Invalid request body" };

export type MealItemInput = {
  /** Missing means a new item. */
  id: number | undefined;
  food: string;
  quantity: string | null;
};

export type MealInput = {
  /** Missing means a new meal. */
  id: number | undefined;
  name: string;
  timeOfDay: string | null;
  notes: string | null;
  items: MealItemInput[];
};

/** The whole plan as it must be after the save: array order is the new position. */
export type MealPlanInput = {
  notes: string | null;
  meals: MealInput[];
};

export type MealLogsQuery = {
  from: string;
  to: string;
};

/** The meals stored in the plan, with the ids of their items. */
export type SavedMealIds = {
  id: number;
  itemIds: number[];
};

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCalendarDate = (value: unknown): value is string =>
  typeof value === "string" &&
  isValidIsoDate(value) &&
  value >= EARLIEST_DATE &&
  value <= LATEST_DATE;

/** Postgres rejects U+0000 in text with a 500: refused, not stripped, as in the register. */
const checkText = (field: string, text: string, maxLength: number): Invalid | null => {
  if (text.includes("\0")) {
    return { ok: false, error: `${field} must not contain a NUL character` };
  }

  if (text.length > maxLength) {
    return { ok: false, error: `${field} must be at most ${maxLength} characters` };
  }

  return null;
};

const requiredText =
  (field: string, maxLength: number): Parse<string> =>
  (value) => {
    const text = typeof value === "string" ? value.trim() : "";

    if (text.length === 0) {
      return { ok: false, error: `${field} is required` };
    }

    const textError = checkText(field, text, maxLength);

    if (textError !== null) {
      return textError;
    }

    return { ok: true, value: text };
  };

/** Absent, null or blank all store null: an empty note is no note. */
const optionalText =
  (field: string, maxLength: number): Parse<string | null> =>
  (value) => {
    if (value === undefined || value === null) {
      return { ok: true, value: null };
    }

    if (typeof value !== "string") {
      return { ok: false, error: `${field} must be a string or null` };
    }

    const text = value.trim();

    if (text.length === 0) {
      return { ok: true, value: null };
    }

    const textError = checkText(field, text, maxLength);

    if (textError !== null) {
      return textError;
    }

    return { ok: true, value: text };
  };

const optionalId =
  (error: string): Parse<number | undefined> =>
  (value) => {
    if (value === undefined) {
      return { ok: true, value: undefined };
    }

    if (!isDatabaseId(value)) {
      return { ok: false, error };
    }

    return { ok: true, value };
  };

const parseTimeOfDay: Parse<string | null> = (value) => {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== "string" || !TIME_OF_DAY_PATTERN.test(value)) {
    return { ok: false, error: "meals.timeOfDay must be HH:MM or null" };
  }

  return { ok: true, value };
};

/** Parses every entry and stops at the first error, in array order. */
const parseList =
  <T>(field: string, maxEntries: number, parseEntry: Parse<T>): Parse<T[]> =>
  (value) => {
    if (!Array.isArray(value)) {
      return { ok: false, error: `${field} must be an array` };
    }

    if (value.length > maxEntries) {
      return { ok: false, error: `${field} must have at most ${maxEntries} entries` };
    }

    const results = value.map((entry) => parseEntry(entry));
    const firstInvalid = results.find((result): result is Invalid => !result.ok);

    if (firstInvalid) {
      return firstInvalid;
    }

    const entries = results
      .filter((result): result is Valid<T> => result.ok)
      .map((result) => result.value);

    return { ok: true, value: entries };
  };

const parseItemId = optionalId("Invalid meal item id");
const parseFood = requiredText("meals.items.food", MAX_FOOD_LENGTH);
const parseQuantity = optionalText("meals.items.quantity", MAX_QUANTITY_LENGTH);

const parseItem: Parse<MealItemInput> = (value) => {
  if (!isJsonObject(value)) {
    return INVALID_BODY;
  }

  const id = parseItemId(value.id);

  if (!id.ok) {
    return id;
  }

  const food = parseFood(value.food);

  if (!food.ok) {
    return food;
  }

  const quantity = parseQuantity(value.quantity);

  if (!quantity.ok) {
    return quantity;
  }

  return { ok: true, value: { id: id.value, food: food.value, quantity: quantity.value } };
};

const parseMealId = optionalId("Invalid meal id");
const parseMealName = requiredText("meals.name", MAX_MEAL_NAME_LENGTH);
const parseMealNotes = optionalText("meals.notes", MAX_MEAL_NOTES_LENGTH);
const parseItems = parseList("meals.items", MAX_ITEMS_PER_MEAL, parseItem);

const parseMeal: Parse<MealInput> = (value) => {
  if (!isJsonObject(value)) {
    return INVALID_BODY;
  }

  const id = parseMealId(value.id);

  if (!id.ok) {
    return id;
  }

  const name = parseMealName(value.name);

  if (!name.ok) {
    return name;
  }

  const timeOfDay = parseTimeOfDay(value.timeOfDay);

  if (!timeOfDay.ok) {
    return timeOfDay;
  }

  const notes = parseMealNotes(value.notes);

  if (!notes.ok) {
    return notes;
  }

  const items = parseItems(value.items);

  if (!items.ok) {
    return items;
  }

  return {
    ok: true,
    value: {
      id: id.value,
      name: name.value,
      timeOfDay: timeOfDay.value,
      notes: notes.value,
      items: items.value,
    },
  };
};

const parsePlanNotes = optionalText("notes", MAX_MEAL_PLAN_NOTES_LENGTH);
const parseMeals = parseList("meals", MAX_MEALS_PER_PLAN, parseMeal);

const hasDuplicate = (ids: number[]): boolean =>
  ids.some((id, index) => ids.indexOf(id) !== index);

const sentIds = (entries: { id: number | undefined }[]): number[] =>
  entries.map((entry) => entry.id).filter((id): id is number => id !== undefined);

/** Shape, limits and repeated ids. Whether the ids belong to the plan waits for the stored rows. */
export const validateMealPlanInput = (body: unknown): Valid<MealPlanInput> | Invalid => {
  if (!isJsonObject(body)) {
    return INVALID_BODY;
  }

  const notes = parsePlanNotes(body.notes);

  if (!notes.ok) {
    return notes;
  }

  const meals = parseMeals(body.meals);

  if (!meals.ok) {
    return meals;
  }

  if (hasDuplicate(sentIds(meals.value))) {
    return { ok: false, error: "Duplicate meal id" };
  }

  const itemIds = meals.value.flatMap((meal) => sentIds(meal.items));

  if (hasDuplicate(itemIds)) {
    return { ok: false, error: "Duplicate meal item id" };
  }

  return { ok: true, value: { notes: notes.value, meals: meals.value } };
};

export const validateMealPlanPatch = (body: unknown): Valid<{ isActive: boolean }> | Invalid => {
  if (!isJsonObject(body)) {
    return INVALID_BODY;
  }

  if (typeof body.isActive !== "boolean") {
    return { ok: false, error: "isActive must be a boolean" };
  }

  return { ok: true, value: { isActive: body.isActive } };
};

export const validateMealLogsQuery = (
  query: Record<string, unknown>,
): Valid<MealLogsQuery> | Invalid => {
  if (!isCalendarDate(query.from)) {
    return { ok: false, error: "from must be YYYY-MM-DD" };
  }

  if (!isCalendarDate(query.to)) {
    return { ok: false, error: "to must be YYYY-MM-DD" };
  }

  if (query.to < query.from) {
    return { ok: false, error: "to must be on or after from" };
  }

  const dayCount = daysBetween(query.from, query.to) + 1;

  if (dayCount > MAX_MEAL_LOG_RANGE_DAYS) {
    return { ok: false, error: `Range must be at most ${MAX_MEAL_LOG_RANGE_DAYS} days` };
  }

  return { ok: true, value: { from: query.from, to: query.to } };
};

/**
 * The first id in the body that is not a row of this plan, as the 404 to send, or null.
 * An item id must belong to the meal it is sent with: a new meal has no items to update.
 */
export const findForeignMealPlanId = (
  input: MealPlanInput,
  savedMeals: SavedMealIds[],
): "Meal not found" | "Meal item not found" | null => {
  const findSavedMeal = (mealId: number | undefined) =>
    savedMeals.find((saved) => saved.id === mealId);
  const hasForeignMeal = input.meals.some(
    (meal) => meal.id !== undefined && findSavedMeal(meal.id) === undefined,
  );

  if (hasForeignMeal) {
    return "Meal not found";
  }

  const hasForeignItem = input.meals.some((meal) => {
    const savedItemIds = findSavedMeal(meal.id)?.itemIds ?? [];

    return sentIds(meal.items).some((itemId) => !savedItemIds.includes(itemId));
  });

  if (hasForeignItem) {
    return "Meal item not found";
  }

  return null;
};
