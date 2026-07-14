import {
  ApiError,
  abandonSession,
  completeSession,
  getExercisesByWorkout,
  getSession,
  getSessions,
  getWorkout,
  getWorkoutDayExercises,
  logSet,
  startSession,
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

export async function resolveWorkoutSessionId(workoutId: number): Promise<number> {
  try {
    const session = await startSession(workoutId);
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

export async function submitLoggedSet(
  sessionId: number,
  exerciseId: number,
  setNumber: number,
  reps: number,
  weightKg: string,
): Promise<LoggedSet> {
  const parsedWeight = weightKg.trim() === "" ? null : Number(weightKg);

  if (parsedWeight !== null && (!Number.isFinite(parsedWeight) || parsedWeight < 0)) {
    throw new Error("Il peso deve essere un numero valido");
  }

  return logSet(sessionId, {
    exerciseId,
    setNumber,
    reps,
    weightKg: parsedWeight,
  });
}

export async function finishSession(sessionId: number): Promise<WorkoutSessionWithSets> {
  return completeSession(sessionId);
}

export async function cancelSession(sessionId: number): Promise<WorkoutSessionWithSets> {
  return abandonSession(sessionId);
}
