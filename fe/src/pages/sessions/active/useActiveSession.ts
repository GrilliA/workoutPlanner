import { useCallback, useEffect, useMemo, useState } from "react";
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
import { cancelSession, finishSession, submitLoggedSet } from "./api";
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

export function useActiveSession(sessionId: number): UseActiveSessionResult {
  const [fetchId, setFetchId] = useState(0);
  const [status, setStatus] = useState<ActiveSessionStatus>("loading");
  const [bundle, setBundle] = useState<SessionBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusedExerciseId, setFocusedExerciseId] = useState<number | null>(null);
  const [loggingKey, setLoggingKey] = useState<string | null>(null);
  const [completionVolumeKg, setCompletionVolumeKg] = useState(0);

  const retry = useCallback(() => {
    setFetchId((current) => current + 1);
  }, []);

  const loadBundle = useCallback(async (): Promise<SessionBundle> => {
    const session = await getSession(sessionId);
    const workout = await getWorkout(session.workoutId);
    const exercises = session.workoutDayId
      ? await getWorkoutDayExercises(session.workoutId, session.workoutDayId)
      : await getExercisesByWorkout(session.workoutId);

    return { session, workout, exercises };
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      setError(null);

      try {
        const nextBundle = await loadBundle();

        if (cancelled) {
          return;
        }

        setBundle(nextBundle);

        const preliminary = mapActiveSession(
          nextBundle.session,
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
  }, [sessionId, fetchId, loadBundle]);

  const view = useMemo(() => {
    if (!bundle) {
      return null;
    }

    return mapActiveSession(
      bundle.session,
      bundle.workout,
      bundle.exercises,
      focusedExerciseId,
    );
  }, [bundle, focusedExerciseId]);

  const handleFocusExercise = useCallback((exerciseId: number) => {
    setFocusedExerciseId(exerciseId);
  }, []);

  const logSetRow = useCallback(
    async (exerciseId: number, setNumber: number, weightKg: string, reps: number) => {
      const key = toLoggingKey(exerciseId, setNumber);
      setLoggingKey(key);
      setError(null);

      try {
        await submitLoggedSet(sessionId, exerciseId, setNumber, reps, weightKg);
        const nextBundle = await loadBundle();
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
          const nextFocus = resolveFocus(mapped.exercises, null);
          setFocusedExerciseId(nextFocus);
        }
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Impossibile registrare la serie",
        );
      } finally {
        setLoggingKey(null);
      }
    },
    [sessionId, focusedExerciseId, loadBundle],
  );

  const complete = useCallback(async () => {
    setStatus("completing");
    setError(null);

    try {
      if (view) {
        setCompletionVolumeKg(computeSessionVolumeKg(view.exercises));
      }

      await finishSession(sessionId);
      setStatus("completed");
    } catch (err) {
      setStatus("ready");
      setError(
        err instanceof ApiError
          ? err.message
          : "Impossibile completare l'allenamento",
      );
    }
  }, [sessionId, view]);

  const abandon = useCallback(async () => {
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
  }, [sessionId]);

  const completedExerciseCount = useMemo(
    () => (view ? countCompletedExercises(view.exercises) : 0),
    [view],
  );

  return {
    status,
    view,
    error,
    focusedExerciseId,
    loggingKey,
    completionVolumeKg,
    completedExerciseCount,
    setFocusedExerciseId: handleFocusExercise,
    logSetRow,
    complete,
    abandon,
    retry,
  };
}
