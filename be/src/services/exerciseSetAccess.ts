import { asc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { exerciseSets } from "../db/schema";
import type { SetPrescription } from "./exerciseSetValidation";

export type ExerciseSetRow = typeof exerciseSets.$inferSelect;

export async function getSetPrescriptionsByExerciseIds(
  exerciseIds: number[],
): Promise<{ exerciseId: number; setPrescriptions: SetPrescription[] }[]> {
  if (exerciseIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      exerciseId: exerciseSets.exerciseId,
      setNumber: exerciseSets.setNumber,
      reps: exerciseSets.reps,
      restSec: exerciseSets.restSec,
    })
    .from(exerciseSets)
    .where(inArray(exerciseSets.exerciseId, exerciseIds))
    .orderBy(asc(exerciseSets.exerciseId), asc(exerciseSets.setNumber));

  return Object.entries(
    rows.reduce<Record<number, SetPrescription[]>>((groups, row) => {
      const existing = groups[row.exerciseId] ?? [];
      return {
        ...groups,
        [row.exerciseId]: [
          ...existing,
          {
            setNumber: row.setNumber,
            reps: row.reps,
            restSec: row.restSec,
          },
        ],
      };
    }, {}),
  ).map(([exerciseId, setPrescriptions]) => ({
    exerciseId: Number(exerciseId),
    setPrescriptions,
  }));
}

export async function replaceSetPrescriptionsForExercise(
  exerciseId: number,
  prescriptions: SetPrescription[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(exerciseSets).where(eq(exerciseSets.exerciseId, exerciseId));

    if (prescriptions.length > 0) {
      await tx.insert(exerciseSets).values(
        prescriptions.map((prescription) => ({
          exerciseId,
          setNumber: prescription.setNumber,
          reps: prescription.reps,
          restSec: prescription.restSec,
        })),
      );
    }
  });
}

export async function deleteSetPrescriptionsForExerciseIds(
  exerciseIds: number[],
): Promise<void> {
  if (exerciseIds.length === 0) {
    return;
  }

  await db.delete(exerciseSets).where(inArray(exerciseSets.exerciseId, exerciseIds));
}
