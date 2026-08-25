import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { exerciseCatalog, exercises, exerciseSets } from "../db/schema";
import {
  getSetPrescriptionsByExerciseIds,
} from "./exerciseSetAccess";
import {
  summarizeSetPrescriptions,
  validateSetPrescriptions,
  type SetPrescription,
} from "./exerciseSetValidation";
import { deriveImageUrlEnd } from "./catalogI18n";

type ExerciseRow = typeof exercises.$inferSelect;

export type CatalogExerciseFields = {
  nameIt?: string | null;
  nameEn?: string | null;
  imageUrl?: string | null;
  imageUrlEnd?: string | null;
};

export type ExerciseInput = {
  name: string;
  workoutId: number;
  workoutDayId: number;
  setPrescriptions: SetPrescription[];
  catalogId?: string | null;
};

export async function enrichExercises<T extends { id: number; catalogId?: string | null }>(
  rows: T[],
): Promise<Array<T & { setPrescriptions: SetPrescription[] } & CatalogExerciseFields>> {
  const grouped = await getSetPrescriptionsByExerciseIds(rows.map((row) => row.id));
  const catalogIds = [
    ...new Set(
      rows
        .map((row) => row.catalogId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  const catalogRows =
    catalogIds.length > 0
      ? await db
          .select()
          .from(exerciseCatalog)
          .where(inArray(exerciseCatalog.id, catalogIds))
      : [];

  const catalogById = new Map(catalogRows.map((row) => [row.id, row]));

  return rows.map((row) => {
    const catalog = row.catalogId ? catalogById.get(row.catalogId) : undefined;
    const catalogFields: CatalogExerciseFields = catalog
      ? {
          nameIt: catalog.nameIt,
          nameEn: catalog.name,
          imageUrl: catalog.imageUrl,
          imageUrlEnd: catalog.imageUrlEnd ?? deriveImageUrlEnd(catalog.imageUrl),
        }
      : {};

    return {
      ...row,
      setPrescriptions:
        grouped.find((entry) => entry.exerciseId === row.id)?.setPrescriptions ?? [],
      ...catalogFields,
    };
  });
}

export async function createExerciseWithSets(
  input: ExerciseInput,
): Promise<ExerciseRow & { setPrescriptions: SetPrescription[] }> {
  const summary = summarizeSetPrescriptions(input.setPrescriptions);

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(exercises)
      .values({
        name: input.name,
        sets: summary.sets,
        reps: summary.reps,
        workoutId: input.workoutId,
        workoutDayId: input.workoutDayId,
        catalogId: input.catalogId ?? null,
      })
      .returning();

    await tx.insert(exerciseSets).values(
      input.setPrescriptions.map((prescription) => ({
        exerciseId: created.id,
        ...prescription,
      })),
    );

    return {
      ...created,
      setPrescriptions: input.setPrescriptions,
    };
  });
}

export async function updateExerciseWithSets(
  exerciseId: number,
  input: {
    name: string;
    setPrescriptions: SetPrescription[];
    catalogId?: string | null;
  },
): Promise<ExerciseRow & { setPrescriptions: SetPrescription[] }> {
  const summary = summarizeSetPrescriptions(input.setPrescriptions);

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(exercises)
      .set({
        name: input.name,
        sets: summary.sets,
        reps: summary.reps,
        ...(input.catalogId !== undefined ? { catalogId: input.catalogId } : {}),
      })
      .where(eq(exercises.id, exerciseId))
      .returning();

    await tx.delete(exerciseSets).where(eq(exerciseSets.exerciseId, exerciseId));
    await tx.insert(exerciseSets).values(
      input.setPrescriptions.map((prescription) => ({
        exerciseId,
        ...prescription,
      })),
    );

    return {
      ...updated,
      setPrescriptions: input.setPrescriptions,
    };
  });
}

export const parseExerciseBody = (
  body: unknown,
  defaultRestSec: number,
):
  | {
      ok: true;
      value: {
        name: string;
        setPrescriptions: SetPrescription[];
        catalogId: string | null;
      };
    }
  | { ok: false; error: string } => {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";

  if (!name) {
    return { ok: false, error: "name is required" };
  }

  let catalogId: string | null = null;
  if (input.catalogId !== undefined && input.catalogId !== null) {
    if (typeof input.catalogId !== "string" || input.catalogId.trim().length === 0) {
      return { ok: false, error: "catalogId must be a non-empty string" };
    }
    catalogId = input.catalogId.trim();
  }

  if (input.setPrescriptions !== undefined) {
    const parsed = validateSetPrescriptions(input.setPrescriptions, defaultRestSec);

    if (!parsed.ok) {
      return parsed;
    }

    return { ok: true, value: { name, setPrescriptions: parsed.value, catalogId } };
  }

  const sets = input.sets === undefined ? 3 : Number(input.sets);
  const reps = input.reps === undefined ? 10 : Number(input.reps);

  if (!Number.isInteger(sets) || sets < 1) {
    return { ok: false, error: "sets must be a positive integer" };
  }

  if (!Number.isInteger(reps) || reps < 1) {
    return { ok: false, error: "reps must be a positive integer" };
  }

  const setPrescriptions = Array.from({ length: sets }, (_, index) => ({
    setNumber: index + 1,
    reps,
    restSec: defaultRestSec,
  }));

  return { ok: true, value: { name, setPrescriptions, catalogId } };
};
