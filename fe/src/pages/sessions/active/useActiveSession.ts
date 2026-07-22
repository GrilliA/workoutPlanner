import { useEffect, useRef, useState } from "react";
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
import { cancelSession, createLocalLoggedSet, finishSession } from "./api";
import {
  computeSessionVolumeKg,
  countCompletedExercises,
  mapActiveSession,
} from "./mappers/mapActiveSession";
import type { ActiveSessionStatus, ActiveSessionView } from "./types";

type UseActiveSessionResult = {
  status: ActiveSessionStatus;
  view: ActiveSessionView | null;
  error: string | null;
  focusedExerciseId: number | null;
  loggingKey: string | null;
  completionVolumeKg: number;
  completedExerciseCount: number;
  setFocusedExerciseId: (exerciseId: number) => void;
  logSetRow: (
    exerciseId: number,
    setNumber: number,
    weightKg: string,
    reps: number,
  ) => Promise<void>;
  complete: () => Promise<void>;
  abandon: () => Promise<void>;
  retry: () => void;
};

type SessionBundle = {
  session: WorkoutSessionWithSets;
  workout: Workout;
  exercises: Exercise[];
};

const toLoggingKey = (exerciseId: number, setNumber: number): string =>
  `${exerciseId}:${setNumber}`;

const resolveFocus = (
  exercises: ActiveSessionView["exercises"],
  preferred: number | null,
): number | null => {
  if (preferred && exercises.some((exercise) => exercise.exerciseId === preferred)) {
    return preferred;
  }

  return (
    exercises.find((exercise) => !exercise.isComplete)?.exerciseId ??
    exercises[0]?.exerciseId ??
    null
  );
};

async function loadSessionBundle(sessionId: number): Promise<SessionBundle> {
  const session = await getSession(sessionId);
  const workout = await getWorkout(session.workoutId);
  const exercises = session.workoutDayId
    ? await getWorkoutDayExercises(session.workoutId, session.workoutDayId)
    : await getExercisesByWorkout(session.workoutId);

  return { session, workout, exercises };
}

export function useActiveSession(sessionId: number): UseActiveSessionResult {
  const [fetchId, setFetchId] = useState(0);
  const [status, setStatus] = useState<ActiveSessionStatus>("loading");
  const [bundle, setBundle] = useState<SessionBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusedExerciseId, setFocusedExerciseId] = useState<number | null>(null);
  const [loggingKey, setLoggingKey] = useState<string | null>(null);
  const [completionVolumeKg, setCompletionVolumeKg] = useState(0);
  const loggedKeysRef = useRef(new Set<string>());

  const retry = () => {
    setFetchId((current) => current + 1);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      setError(null);
      loggedKeysRef.current = new Set();

      try {
        const nextBundle = await loadSessionBundle(sessionId);

        if (cancelled) {
          return;
        }

        // Active sets live in client memory until TERMINA; start the buffer empty.
        const sessionForActive =
          nextBundle.session.status === "in_progress"
            ? { ...nextBundle.session, sets: [] }
            : nextBundle.session;

        setBundle({
          ...nextBundle,
          session: sessionForActive,
        });

        const preliminary = mapActiveSession(
          sessionForActive,
          nextBundle.workout,
          nextBundle.exercises,
          null,
        );

        setFocusedExerciseId(resolveFocus(preliminary.exercises, null));
        setStatus("ready");
      } catch (err) {
        if (cancelled) {
          return;
        }

        setBundle(null);
        setStatus("error");
        setError(
          err instanceof ApiError
            ? err.message
            : "Impossibile caricare l'allenamento",
        );
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [sessionId, fetchId]);

  const view = bundle
    ? mapActiveSession(
        bundle.session,
        bundle.workout,
        bundle.exercises,
        focusedExerciseId,
      )
    : null;

  const logSetRow = async (
    exerciseId: number,
    setNumber: number,
    weightKg: string,
    reps: number,
  ) => {
    if (!bundle || bundle.session.status !== "in_progress") {
      return;
    }

    const key = toLoggingKey(exerciseId, setNumber);

    // Sync guard: loggingKey alone is too late after local (non-await) logging.
    if (loggedKeysRef.current.has(key)) {
      return;
    }

    loggedKeysRef.current.add(key);
    setLoggingKey(key);
    setError(null);

    try {
      const logged = createLocalLoggedSet(
        sessionId,
        exerciseId,
        setNumber,
        reps,
        weightKg,
      );

      const nextBundle: SessionBundle = {
        ...bundle,
        session: {
          ...bundle.session,
          sets: [...bundle.session.sets, logged],
        },
      };

      setBundle(nextBundle);

      const mapped = mapActiveSession(
        nextBundle.session,
        nextBundle.workout,
        nextBundle.exercises,
        focusedExerciseId,
      );

      const completedExercise = mapped.exercises.find(
        (exercise) => exercise.exerciseId === exerciseId,
      );

      if (completedExercise?.isComplete) {
        setFocusedExerciseId(resolveFocus(mapped.exercises, null));
      }
    } catch (err) {
      loggedKeysRef.current.delete(key);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Impossibile registrare la serie",
      );
    } finally {
      // Let React paint loading=true before clearing (button disable).
      queueMicrotask(() => {
        setLoggingKey((current) => (current === key ? null : current));
      });
    }
  };

  const complete = async () => {
    if (!bundle) {
      return;
    }

    setStatus("completing");
    setError(null);

    try {
      if (view) {
        setCompletionVolumeKg(computeSessionVolumeKg(view.exercises));
      }

      await finishSession(sessionId, bundle.session.sets);
      setStatus("completed");
    } catch (err) {
      setStatus("ready");
      setError(
        err instanceof ApiError
          ? err.message
          : "Impossibile completare l'allenamento",
      );
    }
  };

  const abandon = async () => {
    setError(null);

    try {
      await cancelSession(sessionId);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Impossibile abbandonare l'allenamento",
      );
      throw err;
    }
  };

  const completedExerciseCount = view
    ? countCompletedExercises(view.exercises)
    : 0;

  return {
    status,
    view,
    error,
    focusedExerciseId,
    loggingKey,
    completionVolumeKg,
    completedExerciseCount,
    setFocusedExerciseId,
    logSetRow,
    complete,
    abandon,
    retry,
  };
}
