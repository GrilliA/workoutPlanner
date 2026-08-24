import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  exercises,
  exerciseSets,
  workoutDays,
  workoutDayWeekdays,
  workouts,
} from "../db/schema";
import { parseExerciseBody } from "./exerciseAccess";
import { summarizeSetPrescriptions, type SetPrescription } from "./exerciseSetValidation";
import {
  validateCreateWorkoutDayInput,
  type CreateWorkoutDayInput,
} from "./workoutDayValidation";
import {
  validateCreateWorkoutInput,
  type CreateWorkoutInput,
} from "./workoutValidation";

type WorkoutProgramExercise = {
  id?: number;
  name: string;
  catalogId?: string | null;
  setPrescriptions: SetPrescription[];
};

type WorkoutProgramDay = CreateWorkoutDayInput & {
  id?: number;
  exercises: WorkoutProgramExercise[];
};

export type WorkoutProgramInput = CreateWorkoutInput & {
  days: WorkoutProgramDay[];
};

type ValidationResult =
  | { ok: true; value: WorkoutProgramInput }
  | { ok: false; error: string };

const parseOptionalId = (
  value: unknown,
  label: string,
): { ok: true; value?: number } | { ok: false; error: string } => {
  if (value === undefined) {
    return { ok: true };
  }

  const id = Number(value);

  return Number.isInteger(id) && id > 0
    ? { ok: true, value: id }
    : { ok: false, error: `${label} must be a positive integer` };
};

export const validateWorkoutProgramInput = (body: unknown): ValidationResult => {
  const workout = validateCreateWorkoutInput(body);

  if (!workout.ok) {
    return workout;
  }

  const input = body as Record<string, unknown>;

  if (!Array.isArray(input.days) || input.days.length === 0) {
    return { ok: false, error: "At least one workout day is required" };
  }

  const dayIds = new Set<number>();
  const exerciseIds = new Set<number>();
  const weekdays = new Set<number>();
  const days: WorkoutProgramDay[] = [];

  for (const rawDay of input.days) {
    const day = validateCreateWorkoutDayInput(rawDay);

    if (!day.ok) {
      return day;
    }

    const dayInput = rawDay as Record<string, unknown>;
    const parsedDayId = parseOptionalId(dayInput.id, "day id");

    if (!parsedDayId.ok) {
      return parsedDayId;
    }

    if (parsedDayId.value && dayIds.has(parsedDayId.value)) {
      return { ok: false, error: "Duplicate day id" };
    }

    if (day.value.weekdays.some((weekday) => weekdays.has(weekday))) {
      return { ok: false, error: "A weekday can only belong to one workout day" };
    }

    day.value.weekdays.forEach((weekday) => weekdays.add(weekday));

    if (parsedDayId.value) {
      dayIds.add(parsedDayId.value);
    }

    if (!Array.isArray(dayInput.exercises)) {
      return { ok: false, error: "exercises must be an array" };
    }

    const parsedExercises: WorkoutProgramExercise[] = [];

    for (const rawExercise of dayInput.exercises) {
      const exercise = parseExerciseBody(rawExercise, workout.value.defaultRestSec);

      if (!exercise.ok) {
        return exercise;
      }

      const exerciseInput = rawExercise as Record<string, unknown>;
      const parsedExerciseId = parseOptionalId(exerciseInput.id, "exercise id");

      if (!parsedExerciseId.ok) {
        return parsedExerciseId;
      }

      if (parsedExerciseId.value && exerciseIds.has(parsedExerciseId.value)) {
        return { ok: false, error: "Duplicate exercise id" };
      }

      if (parsedExerciseId.value) {
        exerciseIds.add(parsedExerciseId.value);
      }

      parsedExercises.push({
        id: parsedExerciseId.value,
        ...exercise.value,
      });
    }

    days.push({
      id: parsedDayId.value,
      ...day.value,
      exercises: parsedExercises,
    });
  }

  return { ok: true, value: { ...workout.value, days } };
};

type SaveWorkoutProgramResult =
  | {
      ok: true;
      workout: typeof workouts.$inferSelect & { exerciseCount: number };
    }
  | { ok: false; status: 400 | 404; error: string };

export type SaveWorkoutProgramOptions = {
  kind?: "template" | "program";
  createdByUserId?: number;
  sourceTemplateId?: number | null;
  isActive?: boolean;
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const saveWorkoutProgram = async (
  userId: number,
  input: WorkoutProgramInput,
  workoutId?: number,
  options: SaveWorkoutProgramOptions = {},
  externalTx?: Tx,
): Promise<SaveWorkoutProgramResult> => {
  const run = async (tx: Tx): Promise<SaveWorkoutProgramResult> => {
    const existingWorkout = workoutId
      ? (
          await tx
            .select()
            .from(workouts)
            .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
            .for("update")
        )[0]
      : null;

    if (workoutId && !existingWorkout) {
      return { ok: false, status: 404, error: "Workout not found" };
    }

    const existingDays = workoutId
      ? await tx.select().from(workoutDays).where(eq(workoutDays.workoutId, workoutId))
      : [];
    const existingExercises = workoutId
      ? await tx.select().from(exercises).where(eq(exercises.workoutId, workoutId))
      : [];

    if (!workoutId && input.days.some((day) => day.id || day.exercises.some((item) => item.id))) {
      return { ok: false, status: 400, error: "New programs cannot reference existing ids" };
    }

    const validDayIds = new Set(existingDays.map((day) => day.id));
    const validExercisesById = new Map(
      existingExercises.map((exercise) => [exercise.id, exercise]),
    );

    for (const day of input.days) {
      if (day.id && !validDayIds.has(day.id)) {
        return { ok: false, status: 400, error: "Workout day does not belong to this workout" };
      }

      for (const exercise of day.exercises) {
        if (!exercise.id) {
          continue;
        }

        const existing = validExercisesById.get(exercise.id);

        if (!day.id || !existing || existing.workoutDayId !== day.id) {
          return { ok: false, status: 400, error: "Exercise does not belong to this workout day" };
        }
      }
    }

    const kind = options.kind ?? existingWorkout?.kind ?? "program";
    const createdByUserId =
      options.createdByUserId ?? existingWorkout?.createdByUserId ?? userId;
    const sourceTemplateId =
      options.sourceTemplateId !== undefined
        ? options.sourceTemplateId
        : (existingWorkout?.sourceTemplateId ?? null);

    const workoutValues = {
      name: input.name,
      defaultRestSec: input.defaultRestSec,
      workoutType: input.workoutType,
      frequency: input.frequency,
      kind,
      createdByUserId,
      sourceTemplateId,
      ...(options.isActive !== undefined
        ? { isActive: options.isActive }
        : input.isActive !== undefined
          ? { isActive: input.isActive }
          : {}),
    };
    const [savedWorkout] = workoutId
      ? await tx
          .update(workouts)
          .set(workoutValues)
          .where(eq(workouts.id, workoutId))
          .returning()
      : await tx
          .insert(workouts)
          .values({
            ...workoutValues,
            isActive:
              options.isActive ?? input.isActive ?? true,
            userId,
          })
          .returning();

    const keptDayIds = new Set(input.days.flatMap((day) => (day.id ? [day.id] : [])));
    const removedDayIds = existingDays
      .filter((day) => !keptDayIds.has(day.id))
      .map((day) => day.id);

    if (removedDayIds.length > 0) {
      await tx.delete(workoutDays).where(inArray(workoutDays.id, removedDayIds));
    }

    for (const day of input.days) {
      const [savedDay] = day.id
        ? await tx
            .update(workoutDays)
            .set({ name: day.name, sortOrder: day.sortOrder })
            .where(eq(workoutDays.id, day.id))
            .returning()
        : await tx
            .insert(workoutDays)
            .values({
              workoutId: savedWorkout.id,
              name: day.name,
              sortOrder: day.sortOrder,
            })
            .returning();

      await tx
        .delete(workoutDayWeekdays)
        .where(eq(workoutDayWeekdays.workoutDayId, savedDay.id));

      if (day.weekdays.length > 0) {
        await tx.insert(workoutDayWeekdays).values(
          day.weekdays.map((weekday) => ({ workoutDayId: savedDay.id, weekday })),
        );
      }

      const currentExercises = existingExercises.filter(
        (exercise) => exercise.workoutDayId === savedDay.id,
      );
      const keptExerciseIds = new Set(
        day.exercises.flatMap((exercise) => (exercise.id ? [exercise.id] : [])),
      );
      const removedExerciseIds = currentExercises
        .filter((exercise) => !keptExerciseIds.has(exercise.id))
        .map((exercise) => exercise.id);

      if (removedExerciseIds.length > 0) {
        await tx.delete(exercises).where(inArray(exercises.id, removedExerciseIds));
      }

      for (const exercise of day.exercises) {
        const summary = summarizeSetPrescriptions(exercise.setPrescriptions);
        const exerciseValues = {
          name: exercise.name,
          sets: summary.sets,
          reps: summary.reps,
          catalogId: exercise.catalogId ?? null,
        };
        const [savedExercise] = exercise.id
          ? await tx
              .update(exercises)
              .set(exerciseValues)
              .where(eq(exercises.id, exercise.id))
              .returning()
          : await tx
              .insert(exercises)
              .values({
                ...exerciseValues,
                workoutId: savedWorkout.id,
                workoutDayId: savedDay.id,
              })
              .returning();

        await tx.delete(exerciseSets).where(eq(exerciseSets.exerciseId, savedExercise.id));
        await tx.insert(exerciseSets).values(
          exercise.setPrescriptions.map((prescription) => ({
            exerciseId: savedExercise.id,
            ...prescription,
          })),
        );
      }
    }

    return {
      ok: true,
      workout: {
        ...savedWorkout,
        exerciseCount: input.days.reduce(
          (count, day) => count + day.exercises.length,
          0,
        ),
      },
    };
  };

  return externalTx ? await run(externalTx) : await db.transaction(run);
};
