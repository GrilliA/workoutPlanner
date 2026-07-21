import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  abandonSession,
  completeSession,
  getExercisesByWorkout,
  getSession,
  getWorkout,
  getWorkoutDayExercises,
  logSet,
  type Exercise,
  type WorkoutSessionWithSets,
} from "../../src/api";
import { ApiError } from "../../src/api/client";
import {
  Body,
  BackHeader,
  ErrorBanner,
  Heading,
  LoadingBlock,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "../../src/components";
import { ExerciseCard } from "../../src/features/session/ExerciseCard";
import { groupSetsByExercise } from "../../src/features/session/groupSetsByExercise";
import { RestTimerCard } from "../../src/features/session/RestTimerCard";
import { useRestTimer } from "../../src/features/session/useRestTimer";
import { spacing } from "../../src/theme";

export default function SessionScreen() {
  const { sessionId: rawId } = useLocalSearchParams<{ sessionId: string }>();
  const sessionId = Number(rawId);
  const [session, setSession] = useState<WorkoutSessionWithSets | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutName, setWorkoutName] = useState("");
  const [defaultRestSec, setDefaultRestSec] = useState(90);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [repsByExercise, setRepsByExercise] = useState<Record<number, string>>(
    {},
  );
  const [weightByExercise, setWeightByExercise] = useState<
    Record<number, string>
  >({});
  const [fetchId, setFetchId] = useState(0);
  const timer = useRestTimer(sessionId);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!Number.isFinite(sessionId)) {
        setError("Sessione non valida");
        setLoading(false);
        return;
      }

      setError(null);

      try {
        const nextSession = await getSession(sessionId);
        const workout = await getWorkout(nextSession.workoutId);
        const nextExercises = nextSession.workoutDayId
          ? await getWorkoutDayExercises(
              nextSession.workoutId,
              nextSession.workoutDayId,
            )
          : await getExercisesByWorkout(nextSession.workoutId);

        if (cancelled) {
          return;
        }

        setSession(nextSession);
        setExercises(nextExercises);
        setWorkoutName(workout.name);
        setDefaultRestSec(workout.defaultRestSec);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Errore caricamento");
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
  }, [sessionId, fetchId]);

  if (loading) {
    return <LoadingBlock />;
  }

  if (!session) {
    return (
      <Screen>
        <ErrorBanner
          message={error ?? "Sessione non trovata"}
          onRetry={() => {
            setLoading(true);
            setFetchId((id) => id + 1);
          }}
        />
      </Screen>
    );
  }

  const readOnly = session.status !== "in_progress";
  const setsByExercise = groupSetsByExercise(session.sets);

  const onLogSet = async (exercise: Exercise) => {
    if (session.status !== "in_progress") {
      return;
    }

    const reps = Number(repsByExercise[exercise.id] ?? "");
    const weightRaw = weightByExercise[exercise.id]?.trim() ?? "";
    const weightKg = weightRaw === "" ? null : Number(weightRaw);

    if (!Number.isFinite(reps) || reps <= 0) {
      setError("Inserisci le reps");
      return;
    }

    if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 0)) {
      setError("Peso non valido");
      return;
    }

    const setNumber = (setsByExercise.get(exercise.id)?.length ?? 0) + 1;
    setError(null);

    try {
      const logged = await logSet(session.id, {
        exerciseId: exercise.id,
        setNumber,
        reps,
        weightKg,
      });
      setSession((current) =>
        current ? { ...current, sets: [...current.sets, logged] } : current,
      );

      const restSec =
        exercise.setPrescriptions[0]?.restSec ?? defaultRestSec;
      if (restSec > 0) {
        try {
          await timer.start(restSec, exercise.id);
        } catch {
          // Notifiche possono fallire (web / permessi): il set è già loggato.
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Log set fallito");
    }
  };

  const finish = async (mode: "complete" | "abandon") => {
    try {
      timer.cancel();
      if (mode === "complete") {
        await completeSession(session.id);
      } else {
        await abandonSession(session.id);
      }
      router.replace("/(app)");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Operazione fallita");
    }
  };

  return (
    <Screen padded={false}>
      <BackHeader onPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Heading>{workoutName}</Heading>
        <Body>
          Stato: {session.status}
          {readOnly ? " (sola lettura)" : ""}
        </Body>

        <RestTimerCard
          status={timer.status}
          remainingSec={timer.remainingSec}
          onSkip={timer.skip}
        />

        {error ? <ErrorBanner message={error} /> : null}

        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            sets={setsByExercise.get(exercise.id) ?? []}
            resting={timer.restingExerciseId === exercise.id}
            readOnly={readOnly}
            weight={weightByExercise[exercise.id] ?? ""}
            reps={repsByExercise[exercise.id] ?? ""}
            onChangeWeight={(value) =>
              setWeightByExercise((current) => ({
                ...current,
                [exercise.id]: value,
              }))
            }
            onChangeReps={(value) =>
              setRepsByExercise((current) => ({
                ...current,
                [exercise.id]: value,
              }))
            }
            onLog={() => {
              void onLogSet(exercise);
            }}
          />
        ))}

        {!readOnly ? (
          <View style={styles.actions}>
            <PrimaryButton
              label="TERMINA"
              onPress={() => void finish("complete")}
            />
            <SecondaryButton
              label="ABBANDONA"
              onPress={() => void finish("abandon")}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
});
