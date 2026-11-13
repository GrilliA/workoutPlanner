import { and, asc, between, eq, inArray, notInArray } from "drizzle-orm";
import { db, type Tx } from "../db";
import { isUniqueViolation } from "../db/errors";
import { coachAthletes, mealLogs, mealPlanItems, mealPlanMeals, mealPlans } from "../db/schema";
import { dailyAdherence } from "./mealPlan";
import {
  findForeignMealPlanId,
  type MealInput,
  type MealLogsQuery,
  type MealPlanInput,
  type SavedMealIds,
} from "./mealPlanValidation";

type Reader = Pick<typeof db, "select">;

type Failure = { ok: false; status: 404 | 409; error: string };
type Result<T> = { ok: true; value: T } | Failure;

type MealPlanRow = typeof mealPlans.$inferSelect;
type MealRow = typeof mealPlanMeals.$inferSelect;
type ItemRow = typeof mealPlanItems.$inferSelect;

const CLIENT_NOT_FOUND: Failure = { ok: false, status: 404, error: "Client not found" };

const isOfCoachAndAthlete = (coachId: number, athleteId: number) =>
  and(eq(mealPlans.coachId, coachId), eq(mealPlans.athleteId, athleteId));

// `coachId` and the parent ids stay inside: the contract does not expose them.
const toMealPlan = (plan: MealPlanRow, meals: MealRow[], items: ItemRow[]) => ({
  id: plan.id,
  athleteId: plan.athleteId,
  isActive: plan.isActive,
  notes: plan.notes,
  meals: meals.map((meal) => ({
    id: meal.id,
    name: meal.name,
    timeOfDay: meal.timeOfDay,
    notes: meal.notes,
    position: meal.position,
    items: items
      .filter((item) => item.mealId === meal.id)
      .map((item) => ({
        id: item.id,
        food: item.food,
        quantity: item.quantity,
        position: item.position,
      })),
  })),
  createdAt: plan.createdAt,
  updatedAt: plan.updatedAt,
});

export type MealPlanResponse = ReturnType<typeof toMealPlan>;

/** Meals and items in position order; the id breaks a tie, as `nextMealId` does. */
const buildMealPlan = async (reader: Reader, plan: MealPlanRow): Promise<MealPlanResponse> => {
  const meals = await reader
    .select()
    .from(mealPlanMeals)
    .where(eq(mealPlanMeals.mealPlanId, plan.id))
    .orderBy(asc(mealPlanMeals.position), asc(mealPlanMeals.id));
  const mealIds = meals.map((meal) => meal.id);

  if (mealIds.length === 0) {
    return toMealPlan(plan, meals, []);
  }

  const items = await reader
    .select()
    .from(mealPlanItems)
    .where(inArray(mealPlanItems.mealId, mealIds))
    .orderBy(asc(mealPlanItems.position), asc(mealPlanItems.id));

  return toMealPlan(plan, meals, items);
};

export const loadMealPlan = async (
  coachId: number,
  athleteId: number,
): Promise<MealPlanResponse | null> => {
  const [plan] = await db.select().from(mealPlans).where(isOfCoachAndAthlete(coachId, athleteId));

  if (!plan) {
    return null;
  }

  return buildMealPlan(db, plan);
};

/**
 * The link first, shared, then the plan, exclusive: the same order as unlinking, which locks
 * the link and then deletes the plan through the cascade. A save and an unlink at once never
 * leave a plan behind for an ex client.
 */
const lockMealPlan = async (
  tx: Tx,
  coachId: number,
  athleteId: number,
): Promise<Result<MealPlanRow | null>> => {
  const [link] = await tx
    .select({ id: coachAthletes.id })
    .from(coachAthletes)
    .where(and(eq(coachAthletes.coachId, coachId), eq(coachAthletes.athleteId, athleteId)))
    .for("share");

  if (!link) {
    return CLIENT_NOT_FOUND;
  }

  const [plan] = await tx
    .select()
    .from(mealPlans)
    .where(isOfCoachAndAthlete(coachId, athleteId))
    .for("update");

  return { ok: true, value: plan ?? null };
};

const listSavedMealIds = async (tx: Tx, plan: MealPlanRow | null): Promise<SavedMealIds[]> => {
  if (plan === null) {
    return [];
  }

  const meals = await tx
    .select({ id: mealPlanMeals.id })
    .from(mealPlanMeals)
    .where(eq(mealPlanMeals.mealPlanId, plan.id));
  const mealIds = meals.map((meal) => meal.id);

  if (mealIds.length === 0) {
    return [];
  }

  const items = await tx
    .select({ id: mealPlanItems.id, mealId: mealPlanItems.mealId })
    .from(mealPlanItems)
    .where(inArray(mealPlanItems.mealId, mealIds));

  return mealIds.map((mealId) => ({
    id: mealId,
    itemIds: items.filter((item) => item.mealId === mealId).map((item) => item.id),
  }));
};

const writePlanRow = async (
  tx: Tx,
  coachId: number,
  athleteId: number,
  saved: MealPlanRow | null,
  notes: string | null,
): Promise<MealPlanRow> => {
  if (saved === null) {
    const [created] = await tx
      .insert(mealPlans)
      .values({ coachId, athleteId, notes, isActive: true })
      .returning();
    return created;
  }

  const [updated] = await tx
    .update(mealPlans)
    .set({ notes, updatedAt: new Date() })
    .where(eq(mealPlans.id, saved.id))
    .returning();
  return updated;
};

const keptIds = (entries: { id: number | undefined }[]): number[] =>
  entries.map((entry) => entry.id).filter((id): id is number => id !== undefined);

/**
 * Meals and items of this plan whose id the body does not send. Removing a meal sets
 * meal_id to NULL on its logs, which keep the copied meal name.
 */
const deleteUnsentRows = async (tx: Tx, planId: number, input: MealPlanInput) => {
  const keptMealIds = keptIds(input.meals);
  const isOfPlan = eq(mealPlanMeals.mealPlanId, planId);
  const unsentMeals =
    keptMealIds.length === 0 ? isOfPlan : and(isOfPlan, notInArray(mealPlanMeals.id, keptMealIds));

  await tx.delete(mealPlanMeals).where(unsentMeals);

  if (keptMealIds.length === 0) {
    return;
  }

  const keptItemIds = input.meals.flatMap((meal) => keptIds(meal.items));
  const isOfKeptMeal = inArray(mealPlanItems.mealId, keptMealIds);
  const unsentItems =
    keptItemIds.length === 0 ? isOfKeptMeal : and(isOfKeptMeal, notInArray(mealPlanItems.id, keptItemIds));

  await tx.delete(mealPlanItems).where(unsentItems);
};

/** Updates filter on the plan too: an id is never written outside the plan it was checked in. */
const writeMealRow = async (
  tx: Tx,
  planId: number,
  meal: MealInput,
  position: number,
): Promise<number> => {
  const fields = { name: meal.name, timeOfDay: meal.timeOfDay, notes: meal.notes, position };

  if (meal.id === undefined) {
    const [created] = await tx
      .insert(mealPlanMeals)
      .values({ mealPlanId: planId, ...fields })
      .returning({ id: mealPlanMeals.id });
    return created.id;
  }

  await tx
    .update(mealPlanMeals)
    .set(fields)
    .where(and(eq(mealPlanMeals.id, meal.id), eq(mealPlanMeals.mealPlanId, planId)));
  return meal.id;
};

const writeItemRows = async (tx: Tx, mealId: number, meal: MealInput) => {
  const positionedItems = meal.items.map((item, position) => ({
    id: item.id,
    fields: { food: item.food, quantity: item.quantity, position },
  }));
  const sentItems = positionedItems.flatMap((item) =>
    item.id === undefined ? [] : [{ id: item.id, fields: item.fields }],
  );
  const newItems = positionedItems
    .filter((item) => item.id === undefined)
    .map((item) => ({ mealId, ...item.fields }));

  for (const item of sentItems) {
    await tx
      .update(mealPlanItems)
      .set(item.fields)
      .where(and(eq(mealPlanItems.id, item.id), eq(mealPlanItems.mealId, mealId)));
  }

  if (newItems.length > 0) {
    await tx.insert(mealPlanItems).values(newItems);
  }
};

type SavedMealPlan = { isCreated: boolean; mealPlan: MealPlanResponse };

/**
 * Replaces the plan with the body in one transaction: a sent id updates its row, a missing id
 * creates one, a stored id not sent is removed. Ids are checked against the locked plan first.
 */
export const saveMealPlan = async (
  coachId: number,
  athleteId: number,
  input: MealPlanInput,
): Promise<Result<SavedMealPlan>> => {
  try {
    return await db.transaction(async (tx): Promise<Result<SavedMealPlan>> => {
      const locked = await lockMealPlan(tx, coachId, athleteId);

      if (!locked.ok) {
        return locked;
      }

      const savedMealIds = await listSavedMealIds(tx, locked.value);
      const foreignIdError = findForeignMealPlanId(input, savedMealIds);

      if (foreignIdError !== null) {
        return { ok: false, status: 404, error: foreignIdError };
      }

      const plan = await writePlanRow(tx, coachId, athleteId, locked.value, input.notes);
      await deleteUnsentRows(tx, plan.id, input);

      for (const [position, meal] of input.meals.entries()) {
        const mealId = await writeMealRow(tx, plan.id, meal, position);
        await writeItemRows(tx, mealId, meal);
      }

      const mealPlan = await buildMealPlan(tx, plan);

      return { ok: true, value: { isCreated: locked.value === null, mealPlan } };
    });
  } catch (error) {
    // Two first saves at once: the lock finds no row to wait on, the unique pair stops the second.
    if (isUniqueViolation(error)) {
      return { ok: false, status: 409, error: "Meal plan already exists" };
    }

    throw error;
  }
};

/** Null when the pair has no plan. Setting the same value again is fine: only updatedAt moves. */
export const setMealPlanActive = async (
  coachId: number,
  athleteId: number,
  isActive: boolean,
): Promise<MealPlanResponse | null> =>
  db.transaction(async (tx) => {
    const [plan] = await tx
      .update(mealPlans)
      .set({ isActive, updatedAt: new Date() })
      .where(isOfCoachAndAthlete(coachId, athleteId))
      .returning();

    if (!plan) {
      return null;
    }

    return buildMealPlan(tx, plan);
  });

/** One row per day of the range, against the meals the plan has now; no plan → all zero. */
export const loadMealDayAdherence = async (
  coachId: number,
  athleteId: number,
  query: MealLogsQuery,
) => {
  const [plan] = await db
    .select({ id: mealPlans.id })
    .from(mealPlans)
    .where(isOfCoachAndAthlete(coachId, athleteId));

  if (!plan) {
    return dailyAdherence({ from: query.from, to: query.to, mealIds: [], logs: [] });
  }

  const [meals, logs] = await Promise.all([
    db.select({ id: mealPlanMeals.id }).from(mealPlanMeals).where(eq(mealPlanMeals.mealPlanId, plan.id)),
    db
      .select({ mealId: mealLogs.mealId, date: mealLogs.date, status: mealLogs.status })
      .from(mealLogs)
      .where(and(eq(mealLogs.mealPlanId, plan.id), between(mealLogs.date, query.from, query.to))),
  ]);

  return dailyAdherence({
    from: query.from,
    to: query.to,
    mealIds: meals.map((meal) => meal.id),
    logs,
  });
};
