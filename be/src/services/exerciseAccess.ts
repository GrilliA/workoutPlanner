import { eq } from "drizzle-orm";
import { db } from "../db";
import { exercises, exerciseSets } from "../db/schema";
import {
  getSetPrescriptionsByExerciseIds,
} from "./exerciseSetAccess";
import {
  summarizeSetPrescriptions,
  validateSetPrescriptions,
  type SetPrescription,
} from "./exerciseSetValidation";

type ExerciseRow = typeof exercises.$inferSelect;

export type ExerciseInput = {
  name: string;
  workoutId: number;
  workoutDayId: number;
  setPrescriptions: SetPrescription[];
};

export async function enrichExercises<T extends { id: number }>(
  rows: T[],
): Promise<Array<T & { setPrescriptions: SetPrescription[] }>> {
  const grouped = await getSetPrescriptionsByExerciseIds(rows.map((row) => row.id));

  return rows.map((row) => ({
    ...row,
    setPrescriptions:
      grouped.find((entry) => entry.exerciseId === row.id)?.setPrescriptions ?? [],
  }));
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
  | { ok: true; value: { name: string; setPrescriptions: SetPrescription[] } }
  | { ok: false; error: string } => {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";

  if (!name) {
    return { ok: false, error: "name is required" };
  }

  if (input.setPrescriptions !== undefined) {
    const parsed = validateSetPrescriptions(input.setPrescriptions, defaultRestSec);

    if (!parsed.ok) {
      return parsed;
    }

    return { ok: true, value: { name, setPrescriptions: parsed.value } };
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

  return { ok: true, value: { name, setPrescriptions } };
};
