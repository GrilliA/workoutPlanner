import type { Exercise, LoggedSet, Workout, WorkoutSessionWithSets } from "@api";
import type { ActiveExerciseCard, ActiveSessionView, ActiveSetRow } from "../types";

const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = 10;

const getExercisePrescriptions = (exercise: Exercise, defaultRestSec: number) => {
  if (exercise.setPrescriptions.length > 0) {
    return exercise.setPrescriptions.map((entry) => ({
      setNumber: entry.setNumber,
      reps: entry.reps,
      restSec: entry.restSec ?? defaultRestSec,
    }));
  }

  const targetSets = exercise.sets ?? DEFAULT_TARGET_SETS;
  const targetReps = exercise.reps ?? DEFAULT_TARGET_REPS;

  return Array.from({ length: targetSets }, (_, index) => ({
    setNumber: index + 1,
    reps: targetReps,
    restSec: defaultRestSec,
  }));
};

const buildSetRows = (
  exercise: Exercise,
  loggedSets: LoggedSet[],
  activeExerciseId: number | null,
  defaultRestSec: number,
): ActiveSetRow[] => {
  const prescriptions = getExercisePrescriptions(exercise, defaultRestSec);
  const exerciseLogs = loggedSets.filter((set) => set.exerciseId === exercise.id);

  return prescriptions.map((prescription) => {
    const logged = exerciseLogs.find((set) => set.setNumber === prescription.setNumber);

    if (logged) {
      return {
        setNumber: prescription.setNumber,
        targetReps: logged.reps,
        restSec: prescription.restSec,
        weightKg: logged.weightKg === null ? "" : String(logged.weightKg),
        status: "completed" as const,
        loggedSetId: logged.id,
      };
    }

    const isActiveExercise = exercise.id === activeExerciseId;
    const previousSetsDone = prescriptions
      .filter((entry) => entry.setNumber < prescription.setNumber)
      .every((entry) =>
        exerciseLogs.some((set) => set.setNumber === entry.setNumber),
      );

    return {
      setNumber: prescription.setNumber,
      targetReps: prescription.reps,
      restSec: prescription.restSec,
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
    const prescriptions = getExercisePrescriptions(exercise, workout.defaultRestSec);
    const loggedForExercise = session.sets.filter((set) => set.exerciseId === exercise.id);

    return {
      exerciseId: exercise.id,
      index: index + 1,
      name: exercise.name,
      setPrescriptions: prescriptions,
      sets: [],
      isComplete: loggedForExercise.length >= prescriptions.length,
    };
  });

  const activeExerciseId =
    focusedExerciseId ?? findActiveExerciseId(preliminaryCards) ?? exercises[0]?.id ?? null;

  const mappedExercises = exercises.map((exercise, index) => {
    const prescriptions = getExercisePrescriptions(exercise, workout.defaultRestSec);
    const sets = buildSetRows(
      exercise,
      session.sets,
      activeExerciseId,
      workout.defaultRestSec,
    );

    return {
      exerciseId: exercise.id,
      index: index + 1,
      name: exercise.name,
      setPrescriptions: prescriptions,
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
