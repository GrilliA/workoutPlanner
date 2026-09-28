import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ApiError,
  getWorkout,
  getWorkoutDayExercises,
  getWorkoutDays,
  hydrateExercisesFromCatalog,
  type Exercise,
  type WorkoutDetail,
} from "../../src/api";
import { useAuth } from "../../src/auth";
import {
  BackHeader,
  ErrorBanner,
  LoadingBlock,
  Screen,
} from "../../src/components";
import {
  WorkoutBuilder,
  workoutDraftFromServer,
  type WorkoutDraft,
} from "../../src/features/workoutprogram";

const isSelfProgram = (workout: WorkoutDetail, userId: number) =>
  workout.createdByUserId == null || workout.createdByUserId === userId;

export default function EditWorkoutScreen() {
  const { workoutId: rawId } = useLocalSearchParams<{ workoutId: string }>();
  const workoutId = Number(rawId);
  const { user } = useAuth();

  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchId, setFetchId] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!Number.isFinite(workoutId)) {
        setError("Scheda non valida");
        setLoading(false);
        return;
      }

      setError(null);
      try {
        const [detail, days] = await Promise.all([
          getWorkout(workoutId),
          getWorkoutDays(workoutId),
        ]);
        if (cancelled) {
          return;
        }

        const sortedDays = [...days].sort(
          (a, b) => a.sortOrder - b.sortOrder,
        );
        const perDay = await Promise.all(
          sortedDays.map((day) => getWorkoutDayExercises(workoutId, day.id)),
        );
        const hydrated = await hydrateExercisesFromCatalog(perDay.flat());
        if (cancelled) {
          return;
        }

        const exercisesByDayId = new Map<number, Exercise[]>();
        let offset = 0;
        sortedDays.forEach((day, index) => {
          exercisesByDayId.set(
            day.id,
            hydrated.slice(offset, offset + perDay[index]!.length),
          );
          offset += perDay[index]!.length;
        });

        setWorkout(detail);
        setDraft(workoutDraftFromServer(detail, sortedDays, exercisesByDayId));
      } catch (err) {
        if (!cancelled) {
          setError(ApiError.messageFrom(err, "Errore caricamento"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [workoutId, fetchId]);

  if (loading) {
    return <LoadingBlock />;
  }

  if (!workout || !draft) {
    return (
      <Screen>
        <BackHeader onPress={() => router.back()} />
        <ErrorBanner
          message={error ?? "Scheda non trovata"}
          onRetry={() => {
            setLoading(true);
            setFetchId((id) => id + 1);
          }}
        />
      </Screen>
    );
  }

  const readOnly = user == null || !isSelfProgram(workout, user.id);

  return (
    <WorkoutBuilder
      key={workoutId}
      initialDraft={draft}
      workoutId={workoutId}
      readOnly={readOnly}
    />
  );
}
