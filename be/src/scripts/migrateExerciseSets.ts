import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { exercises, exerciseSets, workouts } from "../db/schema";
import { replaceSetPrescriptionsForExercise } from "../services/exerciseSetAccess";

async function migrateExerciseSets() {
  const rows = await db
    .select({
      exerciseId: exercises.id,
      sets: exercises.sets,
      reps: exercises.reps,
      defaultRestSec: workouts.defaultRestSec,
    })
    .from(exercises)
    .innerJoin(workouts, eq(exercises.workoutId, workouts.id));

  for (const row of rows) {
    const setCount = row.sets ?? 0;

    if (setCount < 1) {
      continue;
    }

    const reps = row.reps ?? 10;
    const prescriptions = Array.from({ length: setCount }, (_, index) => ({
      setNumber: index + 1,
      reps,
      restSec: row.defaultRestSec,
    }));

    await replaceSetPrescriptionsForExercise(row.exerciseId, prescriptions);
    console.log(`Exercise ${row.exerciseId}: migrated ${setCount} set(s)`);
  }

  const migrated = await db.select({ id: exerciseSets.id }).from(exerciseSets);
  console.log(`Migration complete. ${migrated.length} exercise set row(s).`);
}

migrateExerciseSets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
