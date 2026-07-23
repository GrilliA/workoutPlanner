import {
  ApiError,
  abandonSession,
  completeSession,
  getExercisesByWorkout,
  getSession,
  getSessions,
  getWorkout,
  getWorkoutDayExercises,
  startSession,
  type LogSetInput,
  type LoggedSet,
  type WorkoutSessionWithSets,
} from "@api";
import type { ActiveSessionView } from "./types";
import { mapActiveSession } from "./mappers/mapActiveSession";

export async function loadActiveSessionView(
  sessionId: number,
  focusedExerciseId: number | null = null,
): Promise<ActiveSessionView> {
  const session = await getSession(sessionId);
  const workout = await getWorkout(session.workoutId);
  const exercises = session.workoutDayId
    ? await getWorkoutDayExercises(session.workoutId, session.workoutDayId)
    : await getExercisesByWorkout(session.workoutId);

  return mapActiveSession(session, workout, exercises, focusedExerciseId);
}

export async function resolveWorkoutSessionId(
  workoutId: number,
  workoutDayId?: number,
): Promise<number> {
  try {
    const session = await startSession(
      workoutId,
      workoutDayId === undefined ? {} : { workoutDayId },
    );
    return session.id;
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      const sessions = await getSessions();
      const active = sessions.find((session) => session.status === "in_progress");

      if (active) {
        return active.id;
      }
    }

    throw err;
  }
}

let nextLocalSetId = -1;

export function createLocalLoggedSet(
  sessionId: number,
  exerciseId: number,
  setNumber: number,
  reps: number,
  weightKg: string,
): LoggedSet {
  const parsedWeight = weightKg.trim() === "" ? null : Number(weightKg);

  if (parsedWeight !== null && (!Number.isFinite(parsedWeight) || parsedWeight < 0)) {
    throw new Error("Il peso deve essere un numero valido");
  }

  const id = nextLocalSetId;
  nextLocalSetId -= 1;

  return {
    id,
    sessionId,
    exerciseId,
    setNumber,
    reps,
    weightKg: parsedWeight,
    rir: null,
    tutSec: null,
    loggedAt: new Date(),
  };
}

export function toCompleteSetsPayload(sets: LoggedSet[]): LogSetInput[] {
  return sets.map((set) => ({
    exerciseId: set.exerciseId,
    setNumber: set.setNumber,
    reps: set.reps,
    weightKg: set.weightKg,
    rir: set.rir,
    tutSec: set.tutSec,
  }));
}

export async function finishSession(
  sessionId: number,
  sets: LoggedSet[],
): Promise<WorkoutSessionWithSets> {
  return completeSession(sessionId, toCompleteSetsPayload(sets));
}

export async function cancelSession(sessionId: number): Promise<WorkoutSessionWithSets> {
  return abandonSession(sessionId);
}
