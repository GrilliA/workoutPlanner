import { useEffect, useState } from "react";
import {
  ApiError,
  getExercisesByWorkout,
  getSession,
  getWorkout,
  getWorkoutDayExercises,
  type Exercise,
  type Workout,
  type WorkoutSessionWithSets,
} from "@api";
import { mapSessionRecap } from "./mappers/mapSessionRecap";
import type { SessionRecapStatus, SessionRecapView } from "./types";

type SessionRecapBundle = {
  session: WorkoutSessionWithSets;
  workout: Workout;
  exercises: Exercise[];
};

type UseSessionRecapResult = {
  status: SessionRecapStatus;
  view: SessionRecapView | null;
  error: string | null;
  retry: () => void;
};

async function loadSessionRecapBundle(sessionId: number): Promise<SessionRecapBundle> {
  const session = await getSession(sessionId);

  if (session.status === "in_progress") {
    throw new ApiError(409, "Sessione ancora in corso");
  }

  const workout = await getWorkout(session.workoutId);
  const exercises = session.workoutDayId
    ? await getWorkoutDayExercises(session.workoutId, session.workoutDayId)
    : await getExercisesByWorkout(session.workoutId);

  return { session, workout, exercises };
}

export function useSessionRecap(sessionId: number): UseSessionRecapResult {
  const [fetchId, setFetchId] = useState(0);
  const [status, setStatus] = useState<SessionRecapStatus>("loading");
  const [view, setView] = useState<SessionRecapView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const retry = () => {
    setFetchId((current) => current + 1);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      setView(null);
      setError(null);

      try {
        const bundle = await loadSessionRecapBundle(sessionId);

        if (cancelled) {
          return;
        }

        setView(mapSessionRecap(bundle.session, bundle.workout, bundle.exercises));
        setStatus("ready");
      } catch (err) {
        if (cancelled) {
          return;
        }

        setView(null);
        setStatus("error");
        setError(
          err instanceof ApiError
            ? err.message
            : "Impossibile caricare il riepilogo",
        );
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [sessionId, fetchId]);

  return { status, view, error, retry };
}
