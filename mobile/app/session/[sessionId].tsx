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
  Screen,
} from "../../src/components";
import { ExerciseCard } from "../../src/features/session/ExerciseCard";
import { groupSetsByExercise } from "../../src/features/session/groupSetsByExercise";
import {
  formatWeightKg,
  getRestSecForSet,
  getTargetSetCount,
  isExerciseComplete,
  resolveLogDefaults,
} from "../../src/features/session/logDefaults";
import { RestTimerCard } from "../../src/features/session/RestTimerCard";
import { SessionActionBar } from "../../src/features/session/SessionActionBar";
import { useRestTimer } from "../../src/features/session/useRestTimer";
import { colors, spacing } from "../../src/theme";

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
  const [finishing, setFinishing] = useState(false);
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

        const grouped = groupSetsByExercise(nextSession.sets);
        const nextWeights: Record<number, string> = {};
        const nextReps: Record<number, string> = {};

        for (const exercise of nextExercises) {
          const defaults = resolveLogDefaults(
            exercise,
            grouped.get(exercise.id) ?? [],
          );
          nextWeights[exercise.id] = defaults.weight;
          nextReps[exercise.id] = defaults.reps;
        }

        setSession(nextSession);
        setExercises(nextExercises);
        setWorkoutName(workout.name);
        setDefaultRestSec(workout.defaultRestSec);
        setWeightByExercise(nextWeights);
        setRepsByExercise(nextReps);
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

    const loggedForExercise = setsByExercise.get(exercise.id) ?? [];
    if (isExerciseComplete(exercise, loggedForExercise.length)) {
      setError("Serie del piano già completate per questo esercizio");
      return;
    }

    const targetSets = getTargetSetCount(exercise);
    const setNumber = loggedForExercise.length + 1;
    if (setNumber > targetSets) {
      setError("Serie del piano già completate per questo esercizio");
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
      setWeightByExercise((current) => ({
        ...current,
        [exercise.id]:
          weightKg === null ? "" : formatWeightKg(weightKg),
      }));
      setRepsByExercise((current) => ({
        ...current,
        [exercise.id]: String(reps),
      }));

      const restSec = getRestSecForSet(exercise, setNumber, defaultRestSec);
      if (restSec > 0 && !isExerciseComplete(exercise, loggedForExercise.length + 1)) {
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
    if (finishing) {
      return;
    }

    setFinishing(true);
    setError(null);

    try {
      timer.cancel();
      if (mode === "complete") {
        await completeSession(session.id);
      } else {
        await abandonSession(session.id);
      }
      router.replace("/(app)");
    } catch (err) {
      setFinishing(false);
      setError(err instanceof ApiError ? err.message : "Operazione fallita");
    }
  };

  return (
    <Screen padded={false}>
      <BackHeader onPress={() => router.back()} />
      <View style={styles.body}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            !readOnly && styles.contentWithBar,
          ]}
          keyboardShouldPersistTaps="handled"
        >
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
        </ScrollView>

        {!readOnly ? (
          <SessionActionBar
            busy={finishing}
            onComplete={() => {
              void finish("complete");
            }}
            onAbandon={() => {
              void finish("abandon");
            }}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  contentWithBar: {
    paddingBottom: spacing.xl + spacing.lg,
  },
});