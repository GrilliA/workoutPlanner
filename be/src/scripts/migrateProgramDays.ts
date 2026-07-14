import "dotenv/config";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { exercises, workouts } from "../db/schema";
import { ensureDefaultWorkoutDay } from "../services/workoutDayAccess";

async function migrateWorkout(workoutId: number) {
  const day = await ensureDefaultWorkoutDay(workoutId, "Giorno 1");

  const updated = await db
    .update(exercises)
    .set({ workoutDayId: day.id })
    .where(and(eq(exercises.workoutId, workoutId), isNull(exercises.workoutDayId)))
    .returning({ id: exercises.id });

  if (updated.length > 0) {
    console.log(
      `Workout ${workoutId}: linked ${updated.length} exercise(s) to day ${day.id}`,
    );
  }
}

async function migrateProgramDays() {
  const allWorkouts = await db.select({ id: workouts.id }).from(workouts);

  await Promise.all(allWorkouts.map((workout) => migrateWorkout(workout.id)));

  console.log(`Migration complete. ${allWorkouts.length} workout(s) processed.`);
}

migrateProgramDays()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
