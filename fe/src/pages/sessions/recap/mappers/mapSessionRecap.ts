import type { Exercise, LoggedSet, Workout, WorkoutSessionWithSets } from "@api";
import type { RecapSetRow, SessionRecapView } from "../types";

const MS_PER_MINUTE = 60_000;

const computeDurationMin = (startedAt: Date, completedAt: Date | null): number => {
  if (!completedAt) {
    return 0;
  }

  const elapsedMs = completedAt.getTime() - startedAt.getTime();

  if (elapsedMs <= 0) {
    return 0;
  }

  return Math.max(1, Math.round(elapsedMs / MS_PER_MINUTE));
};

const computeVolumeKg = (sets: LoggedSet[]): number =>
  sets.reduce((total, set) => {
    if (set.weightKg === null || set.weightKg <= 0) {
      return total;
    }

    return total + set.weightKg * set.reps;
  }, 0);

const mapLoggedSets = (loggedSets: LoggedSet[]): RecapSetRow[] =>
  [...loggedSets]
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((set) => ({
      setNumber: set.setNumber,
      weightKg: set.weightKg,
      reps: set.reps,
    }));

export const mapSessionRecap = (
  session: WorkoutSessionWithSets,
  workout: Workout,
  exercises: Exercise[],
): SessionRecapView => ({
  sessionId: session.id,
  workoutName: workout.name,
  status: session.status === "abandoned" ? "abandoned" : "completed",
  startedAt: session.startedAt,
  completedAt: session.completedAt,
  durationMin: computeDurationMin(session.startedAt, session.completedAt),
  volumeKg: computeVolumeKg(session.sets),
  exercises: exercises.map((exercise, index) => ({
    exerciseId: exercise.id,
    index: index + 1,
    name: exercise.name,
    sets: mapLoggedSets(session.sets.filter((set) => set.exerciseId === exercise.id)),
  })),
});

export const formatRecapDate = (date: Date): string =>
  date.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export const formatVolumeLabel = (volumeKg: number): string => {
  if (volumeKg <= 0) {
    return "0 kg";
  }

  if (volumeKg >= 1000) {
    return `${(volumeKg / 1000).toFixed(1)}k kg`;
  }

  return `${Math.round(volumeKg)} kg`;
};
