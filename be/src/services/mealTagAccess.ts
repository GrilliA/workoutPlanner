import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db, type Tx } from "../db";
import { isUniqueViolation } from "../db/errors";
import { mealTags } from "../db/schema";
import type { Failure, Result } from "./accessResult";
import {
  MAX_MEAL_TAGS_PER_COACH,
  type MealTagInput,
  type MealTagPatch,
} from "./mealPlanValidation";

// Every coach starts with these, in this order (decision of 2026-11-22).
const STARTER_MEAL_TAG_NAMES = ["Colazione", "Spuntino", "Pranzo", "Merenda", "Cena"];

export const MEAL_TAG_NOT_FOUND: Failure = { ok: false, status: 404, error: "Meal tag not found" };
const MEAL_TAG_EXISTS: Failure = { ok: false, status: 409, error: "Meal tag already exists" };

const mealTagColumns = {
  id: mealTags.id,
  name: mealTags.name,
  position: mealTags.position,
  archivedAt: mealTags.archivedAt,
};

type MealTag = { id: number; name: string; position: number; archivedAt: Date | null };

const isLiveTagOf = (coachId: number) =>
  and(eq(mealTags.coachId, coachId), isNull(mealTags.archivedAt));

/**
 * Creates the starter tags for a coach who never had any (archived ones count, so they never
 * come back). Two first reads at once both insert: the unique live name per coach lets one
 * win, and the other's rows are skipped instead of failing.
 */
const ensureStarterMealTags = async (coachId: number) => {
  const [anyTag] = await db
    .select({ id: mealTags.id })
    .from(mealTags)
    .where(eq(mealTags.coachId, coachId))
    .limit(1);

  if (anyTag) {
    return;
  }

  const starterTags = STARTER_MEAL_TAG_NAMES.map((name, position) => ({ coachId, name, position }));
  await db.insert(mealTags).values(starterTags).onConflictDoNothing();
};

/** The tags the coach can pick, in their order; the starter ones on the first read. */
export const listMealTags = async (coachId: number): Promise<MealTag[]> => {
  await ensureStarterMealTags(coachId);

  return db
    .select(mealTagColumns)
    .from(mealTags)
    .where(isLiveTagOf(coachId))
    .orderBy(asc(mealTags.position), asc(mealTags.id));
};

/**
 * Locks every tag of the coach, then reads the live ones in a second statement: a tag a
 * concurrent write added while this one waited is seen, so the count and the order are true.
 * After `ensureStarterMealTags` the coach always has a row to lock. Rows are locked in id
 * order, here and in `readMealTagsOfCoach`: two writers never wait on each other in a cycle.
 */
const lockMealTags = async (tx: Tx, coachId: number) => {
  const lockedTags = await tx
    .select({ id: mealTags.id })
    .from(mealTags)
    .where(eq(mealTags.coachId, coachId))
    .orderBy(asc(mealTags.id))
    .for("update");
  const liveTags: MealTag[] = await tx
    .select(mealTagColumns)
    .from(mealTags)
    .where(isLiveTagOf(coachId))
    .orderBy(asc(mealTags.position), asc(mealTags.id));

  return { liveTags, storedCount: lockedTags.length };
};

/** A new tag goes last. Same name as a live tag, ignoring case → 409. */
export const createMealTag = async (
  coachId: number,
  input: MealTagInput,
): Promise<Result<MealTag>> => {
  await ensureStarterMealTags(coachId);

  try {
    return await db.transaction(async (tx): Promise<Result<MealTag>> => {
      const { liveTags } = await lockMealTags(tx, coachId);

      if (liveTags.length >= MAX_MEAL_TAGS_PER_COACH) {
        return { ok: false, status: 409, error: "Too many meal tags" };
      }

      const lastPosition = Math.max(-1, ...liveTags.map((tag) => tag.position));
      const [created] = await tx
        .insert(mealTags)
        .values({ coachId, name: input.name, position: lastPosition + 1 })
        .returning(mealTagColumns);

      return { ok: true, value: created };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return MEAL_TAG_EXISTS;
    }

    throw error;
  }
};

/** The live tags with `movedTag` at `position` (past the end means last). */
const tagsInNewOrder = (liveTags: MealTag[], movedTag: MealTag, position: number): MealTag[] => {
  const otherTags = liveTags.filter((tag) => tag.id !== movedTag.id);

  return [...otherTags.slice(0, position), movedTag, ...otherTags.slice(position)];
};

/** Rewrites 0, 1, 2… on the live tags whose position changes. */
const writeTagOrder = async (tx: Tx, orderedTags: MealTag[]) => {
  const movedTags = orderedTags
    .map((tag, position) => ({ id: tag.id, position, hasMoved: tag.position !== position }))
    .filter((tag) => tag.hasMoved);

  for (const tag of movedTags) {
    await tx
      .update(mealTags)
      .set({ position: tag.position, updatedAt: new Date() })
      .where(eq(mealTags.id, tag.id));
  }
};

/**
 * Renames, moves or archives a live tag. A rename shows in every plan and template of the
 * coach, since their meals point at the tag; logs keep the name they copied. An archived tag
 * is no longer found here: it cannot be edited or brought back.
 */
export const updateMealTag = async (
  coachId: number,
  tagId: number,
  patch: MealTagPatch,
): Promise<Result<MealTag>> => {
  try {
    return await db.transaction(async (tx): Promise<Result<MealTag>> => {
      const { liveTags } = await lockMealTags(tx, coachId);
      const tag = liveTags.find((liveTag) => liveTag.id === tagId);

      if (tag === undefined) {
        return MEAL_TAG_NOT_FOUND;
      }

      // Archiving takes the tag out of the order, so a position sent with it is moot.
      if (patch.position !== undefined && patch.archived === undefined) {
        await writeTagOrder(tx, tagsInNewOrder(liveTags, tag, patch.position));
      }

      const now = new Date();
      const archivedAt = patch.archived ? now : undefined;
      const [updated] = await tx
        .update(mealTags)
        .set({ name: patch.name, archivedAt, updatedAt: now })
        .where(eq(mealTags.id, tagId))
        .returning(mealTagColumns);

      return { ok: true, value: updated };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return MEAL_TAG_EXISTS;
    }

    throw error;
  }
};

/**
 * The coach's tags among `tagIds`, archived or not; another coach's tags are simply missing.
 * FOR SHARE: an archive running at the same time waits for the save that checked the tag.
 * In id order, like `lockMealTags`.
 */
export const readMealTagsOfCoach = async (tx: Tx, coachId: number, tagIds: number[]) => {
  if (tagIds.length === 0) {
    return [];
  }

  const tags = await tx
    .select({ id: mealTags.id, archivedAt: mealTags.archivedAt })
    .from(mealTags)
    .where(and(eq(mealTags.coachId, coachId), inArray(mealTags.id, tagIds)))
    .orderBy(asc(mealTags.id))
    .for("share");

  return tags.map((tag) => ({ id: tag.id, isArchived: tag.archivedAt !== null }));
};
