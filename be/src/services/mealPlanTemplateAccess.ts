import { and, asc, eq, inArray } from "drizzle-orm";
import { db, type Tx } from "../db";
import { mealPlanTemplateMeals, mealPlanTemplates, mealTags } from "../db/schema";
import {
  MAX_MEAL_PLAN_TEMPLATES_PER_COACH,
  type MealPlanTemplateInput,
  usesUnavailableMealTag,
} from "./mealPlanValidation";
import { MEAL_TAG_NOT_FOUND, readMealTagsOfCoach } from "./mealTagAccess";

type Reader = Pick<typeof db, "select">;

type Failure = { ok: false; status: 404 | 409; error: string };
type Result<T> = { ok: true; value: T } | Failure;

type TemplateRow = typeof mealPlanTemplates.$inferSelect;

const TEMPLATE_NOT_FOUND: Failure = { ok: false, status: 404, error: "Meal plan template not found" };

const isTemplateOfCoach = (coachId: number, templateId: number) =>
  and(eq(mealPlanTemplates.id, templateId), eq(mealPlanTemplates.coachId, coachId));

/** Templates with their meals in order; each meal shows the name of its tag. */
const buildTemplates = async (reader: Reader, templates: TemplateRow[]) => {
  if (templates.length === 0) {
    return [];
  }

  const templateIds = templates.map((template) => template.id);
  const meals = await reader
    .select({
      templateId: mealPlanTemplateMeals.templateId,
      tagId: mealPlanTemplateMeals.tagId,
      name: mealTags.name,
      timeOfDay: mealPlanTemplateMeals.timeOfDay,
    })
    .from(mealPlanTemplateMeals)
    .innerJoin(mealTags, eq(mealTags.id, mealPlanTemplateMeals.tagId))
    .where(inArray(mealPlanTemplateMeals.templateId, templateIds))
    .orderBy(asc(mealPlanTemplateMeals.position), asc(mealPlanTemplateMeals.id));

  // `coachId` and the meals' parent ids stay inside: the contract does not expose them.
  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    meals: meals
      .filter((meal) => meal.templateId === template.id)
      .map((meal) => ({ tagId: meal.tagId, name: meal.name, timeOfDay: meal.timeOfDay })),
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  }));
};

type MealPlanTemplate = Awaited<ReturnType<typeof buildTemplates>>[number];

const buildTemplate = async (reader: Reader, template: TemplateRow): Promise<MealPlanTemplate> => {
  const [built] = await buildTemplates(reader, [template]);
  return built;
};

export const listMealPlanTemplates = async (coachId: number): Promise<MealPlanTemplate[]> => {
  const templates = await db
    .select()
    .from(mealPlanTemplates)
    .where(eq(mealPlanTemplates.coachId, coachId))
    .orderBy(asc(mealPlanTemplates.name), asc(mealPlanTemplates.id));

  return buildTemplates(db, templates);
};

/** 404 unless every tag is the coach's; an archived tag only as often as the template had it. */
const checkTemplateTags = async (
  tx: Tx,
  coachId: number,
  input: MealPlanTemplateInput,
  storedTagIds: number[],
): Promise<Failure | null> => {
  const sentTagIds = input.meals.map((meal) => meal.tagId);
  const coachTags = await readMealTagsOfCoach(tx, coachId, sentTagIds);

  if (usesUnavailableMealTag({ sentTagIds, storedTagIds, coachTags })) {
    return MEAL_TAG_NOT_FOUND;
  }

  return null;
};

const insertTemplateMeals = async (tx: Tx, template: TemplateRow, input: MealPlanTemplateInput) => {
  const meals = input.meals.map((meal, position) => ({
    templateId: template.id,
    coachId: template.coachId,
    position,
    tagId: meal.tagId,
    timeOfDay: meal.timeOfDay,
  }));

  await tx.insert(mealPlanTemplateMeals).values(meals);
};

/**
 * The cap is counted after locking the coach's templates, in a second statement that sees
 * a template created meanwhile. A coach with no template has nothing to lock: two first
 * creations at once can both pass, which a safety cap tolerates.
 */
export const createMealPlanTemplate = async (
  coachId: number,
  input: MealPlanTemplateInput,
): Promise<Result<MealPlanTemplate>> =>
  db.transaction(async (tx): Promise<Result<MealPlanTemplate>> => {
    const isOfCoach = eq(mealPlanTemplates.coachId, coachId);
    await tx.select({ id: mealPlanTemplates.id }).from(mealPlanTemplates).where(isOfCoach).for("update");
    const templates = await tx.select({ id: mealPlanTemplates.id }).from(mealPlanTemplates).where(isOfCoach);

    if (templates.length >= MAX_MEAL_PLAN_TEMPLATES_PER_COACH) {
      return { ok: false, status: 409, error: "Too many meal plan templates" };
    }

    const tagError = await checkTemplateTags(tx, coachId, input, []);

    if (tagError !== null) {
      return tagError;
    }

    const [template] = await tx
      .insert(mealPlanTemplates)
      .values({ coachId, name: input.name })
      .returning();
    await insertTemplateMeals(tx, template, input);

    return { ok: true, value: await buildTemplate(tx, template) };
  });

/** Replaces name and meals. Template meals have no ids: nothing points at them. */
export const replaceMealPlanTemplate = async (
  coachId: number,
  templateId: number,
  input: MealPlanTemplateInput,
): Promise<Result<MealPlanTemplate>> =>
  db.transaction(async (tx): Promise<Result<MealPlanTemplate>> => {
    const [saved] = await tx
      .select({ id: mealPlanTemplates.id })
      .from(mealPlanTemplates)
      .where(isTemplateOfCoach(coachId, templateId))
      .for("update");

    if (!saved) {
      return TEMPLATE_NOT_FOUND;
    }

    const storedMeals = await tx
      .select({ tagId: mealPlanTemplateMeals.tagId })
      .from(mealPlanTemplateMeals)
      .where(eq(mealPlanTemplateMeals.templateId, templateId));
    const storedTagIds = storedMeals.map((meal) => meal.tagId);
    const tagError = await checkTemplateTags(tx, coachId, input, storedTagIds);

    if (tagError !== null) {
      return tagError;
    }

    const [template] = await tx
      .update(mealPlanTemplates)
      .set({ name: input.name, updatedAt: new Date() })
      .where(eq(mealPlanTemplates.id, templateId))
      .returning();
    await tx.delete(mealPlanTemplateMeals).where(eq(mealPlanTemplateMeals.templateId, templateId));
    await insertTemplateMeals(tx, template, input);

    return { ok: true, value: await buildTemplate(tx, template) };
  });

/** False when the coach has no such template. Plans filled from it are not touched. */
export const deleteMealPlanTemplate = async (coachId: number, templateId: number): Promise<boolean> => {
  const deleted = await db
    .delete(mealPlanTemplates)
    .where(isTemplateOfCoach(coachId, templateId))
    .returning({ id: mealPlanTemplates.id });

  return deleted.length > 0;
};
