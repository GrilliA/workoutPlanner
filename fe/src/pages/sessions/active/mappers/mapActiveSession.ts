import type { Exercise, LoggedSet, Workout, WorkoutSessionWithSets } from "@api";
import type { ActiveExerciseCard, ActiveSessionView, ActiveSetRow } from "../types";

const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = 10;

const buildSetRows = (
  exercise: Exercise,
  loggedSets: LoggedSet[],
  activeExerciseId: number | null,
): ActiveSetRow[] => {
  const targetSets = exercise.sets ?? DEFAULT_TARGET_SETS;
  const targetReps = exercise.reps ?? DEFAULT_TARGET_REPS;
  const exerciseLogs = loggedSets.filter((set) => set.exerciseId === exercise.id);

  return Array.from({ length: targetSets }, (_, index) => {
    const setNumber = index + 1;
    const logged = exerciseLogs.find((set) => set.setNumber === setNumber);

    if (logged) {
      return {
        setNumber,
        targetReps: logged.reps,
        weightKg: logged.weightKg === null ? "" : String(logged.weightKg),
        status: "completed" as const,
        loggedSetId: logged.id,
      };
    }

    const isActiveExercise = exercise.id === activeExerciseId;
    const previousSetsDone = Array.from({ length: setNumber - 1 }, (_, i) => i + 1).every(
      (n) => exerciseLogs.some((set) => set.setNumber === n),
    );

    return {
      setNumber,
      targetReps,
      weightKg: "",
      status:
        isActiveExercise && previousSetsDone ? ("active" as const) : ("pending" as const),
      loggedSetId: null,
    };
  });
};

const findActiveExerciseId = (exercises: ActiveExerciseCard[]): number | null => {
  const incomplete = exercises.find((exercise) => !exercise.isComplete);
  return incomplete?.exerciseId ?? null;
};

export const mapActiveSession = (
  session: WorkoutSessionWithSets,
  workout: Workout,
  exercises: Exercise[],
  focusedExerciseId: number | null,
): ActiveSessionView => {
  const preliminaryCards: ActiveExerciseCard[] = exercises.map((exercise, index) => {
    const targetSets = exercise.sets ?? DEFAULT_TARGET_SETS;
    const loggedForExercise = session.sets.filter((set) => set.exerciseId === exercise.id);
    const isComplete = loggedForExercise.length >= targetSets;

    return {
      exerciseId: exercise.id,
      index: index + 1,
      name: exercise.name,
      targetSets,
      targetReps: exercise.reps ?? DEFAULT_TARGET_REPS,
      restSec: workout.defaultRestSec,
      sets: [],
      isComplete,
    };
  });

  const activeExerciseId =
    focusedExerciseId ?? findActiveExerciseId(preliminaryCards) ?? exercises[0]?.id ?? null;

  const mappedExercises = exercises.map((exercise, index) => {
    const targetSets = exercise.sets ?? DEFAULT_TARGET_SETS;
    const sets = buildSetRows(exercise, session.sets, activeExerciseId);

    return {
      exerciseId: exercise.id,
      index: index + 1,
      name: exercise.name,
      targetSets,
      targetReps: exercise.reps ?? DEFAULT_TARGET_REPS,
      restSec: workout.defaultRestSec,
      sets,
      isComplete: sets.every((set) => set.status === "completed"),
    };
  });

  return {
    sessionId: session.id,
    workoutId: workout.id,
    workoutName: workout.name,
    startedAt: session.startedAt,
    defaultRestSec: workout.defaultRestSec,
    exercises: mappedExercises,
  };
};

export const countCompletedExercises = (exercises: ActiveExerciseCard[]): number =>
  exercises.filter((exercise) => exercise.isComplete).length;

export const computeSessionVolumeKg = (exercises: ActiveExerciseCard[]): number =>
  exercises.reduce(
    (total, exercise) =>
      total +
      exercise.sets.reduce((setTotal, set) => {
        if (set.status !== "completed") {
          return setTotal;
        }

        const weight = Number(set.weightKg);

        if (!Number.isFinite(weight) || weight <= 0) {
          return setTotal;
        }

        return setTotal + weight * set.targetReps;
      }, 0),
    0,
  );
