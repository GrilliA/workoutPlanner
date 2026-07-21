import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  abandonSession,
  completeSession,
  getExercisesByWorkout,
  getSession,
  getWorkout,
  getWorkoutDayExercises,
  logSet,
  type Exercise,
  type LoggedSet,
  type WorkoutSessionWithSets,
} from "../../src/api";
import { ApiError } from "../../src/api/client";
import {
  Body,
  ErrorBanner,
  LoadingBlock,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "../../src/components/ui";
import { useRestTimer } from "../../src/features/session/useRestTimer";
import { colors, spacing } from "../../src/theme/colors";

export default function SessionScreen() {
  const { sessionId: rawId } = useLocalSearchParams<{ sessionId: string }>();
  const sessionId = Number(rawId);
  const [session, setSession] = useState<WorkoutSessionWithSets | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutName, setWorkoutName] = useState("");
  const [defaultRestSec, setDefaultRestSec] = useState(90);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [repsByExercise, setRepsByExercise] = useState<Record<number, string>>({});
  const [weightByExercise, setWeightByExercise] = useState<Record<number, string>>({});
  const timer = useRestTimer(sessionId);

  const load = useCallback(async () => {
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
        ? await getWorkoutDayExercises(nextSession.workoutId, nextSession.workoutDayId)
        : await getExercisesByWorkout(nextSession.workoutId);

      setSession(nextSession);
      setExercises(nextExercises);
      setWorkoutName(workout.name);
      setDefaultRestSec(workout.defaultRestSec);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore caricamento");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setsByExercise = useMemo(() => {
    const map = new Map<number, LoggedSet[]>();

    for (const set of session?.sets ?? []) {
      const list = map.get(set.exerciseId) ?? [];
      map.set(set.exerciseId, [...list, set]);
    }

    return map;
  }, [session?.sets]);

  const onLogSet = async (exercise: Exercise) => {
    if (!session || session.status !== "in_progress") {
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
        current
          ? { ...current, sets: [...current.sets, logged] }
          : current,
      );

      const restSec =
        exercise.setPrescriptions[0]?.restSec ?? defaultRestSec;
      if (restSec > 0) {
        await timer.start(restSec, exercise.id);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Log set fallito");
    }
  };

  const finish = async (mode: "complete" | "abandon") => {
    if (!session) {
      return;
    }

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

  if (loading) {
    return <LoadingBlock />;
  }

  if (!session) {
    return (
      <Screen>
        <ErrorBanner message={error ?? "Sessione non trovata"} />
      </Screen>
    );
  }

  const readOnly = session.status !== "in_progress";

  return (
    <Screen style={styles.noPad}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{workoutName}</Text>
        <Body>
          Stato: {session.status}
          {readOnly ? " (sola lettura)" : ""}
        </Body>

        {timer.status !== "idle" ? (
          <View style={styles.timer}>
            <Text style={styles.timerLabel}>
              {timer.status === "done" ? "Recupero finito" : "Recupero"}
            </Text>
            <Text style={styles.timerValue}>
              {timer.status === "done" ? "✓" : `${timer.remainingSec}s`}
            </Text>
            {timer.status === "running" ? (
              <Pressable onPress={timer.skip}>
                <Text style={styles.skip}>Salta</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {error ? <ErrorBanner message={error} /> : null}

        {exercises.map((exercise) => {
          const sets = setsByExercise.get(exercise.id) ?? [];
          const resting = timer.restingExerciseId === exercise.id;

          return (
            <View
              key={exercise.id}
              style={[styles.card, resting && styles.cardResting]}
            >
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.meta}>
                Serie loggate: {sets.length}
                {exercise.sets != null ? ` / ${exercise.sets}` : ""}
              </Text>
              {sets.map((set) => (
                <Text key={set.id} style={styles.setLine}>
                  #{set.setNumber}: {set.weightKg ?? "—"} kg × {set.reps}
                </Text>
              ))}
              {!readOnly ? (
                <View style={styles.logRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="kg"
                    placeholderTextColor={colors.muted}
                    keyboardType="decimal-pad"
                    value={weightByExercise[exercise.id] ?? ""}
                    onChangeText={(value) =>
                      setWeightByExercise((current) => ({
                        ...current,
                        [exercise.id]: value,
                      }))
                    }
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="reps"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    value={repsByExercise[exercise.id] ?? ""}
                    onChangeText={(value) =>
                      setRepsByExercise((current) => ({
                        ...current,
                        [exercise.id]: value,
                      }))
                    }
                  />
                  <Pressable
                    style={styles.logBtn}
                    onPress={() => void onLogSet(exercise)}
                  >
                    <Text style={styles.logBtnLabel}>Log</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}

        {!readOnly ? (
          <View style={styles.actions}>
            <PrimaryButton
              label="Completa"
              onPress={() => void finish("complete")}
            />
            <SecondaryButton
              label="Abbandona"
              onPress={() => void finish("abandon")}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  noPad: { padding: 0 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  title: {
    color: colors.textHeading,
    fontSize: 24,
    fontWeight: "700",
  },
  timer: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
    marginVertical: spacing.sm,
  },
  timerLabel: { color: colors.accent, fontWeight: "700" },
  timerValue: {
    color: colors.textHeading,
    fontSize: 36,
    fontWeight: "700",
    marginVertical: 4,
  },
  skip: { color: colors.text, fontWeight: "600" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  cardResting: {
    borderColor: colors.accent,
  },
  exerciseName: {
    color: colors.textHeading,
    fontWeight: "700",
    fontSize: 17,
  },
  meta: { color: colors.text, marginTop: 4 },
  setLine: { color: colors.text, marginTop: 4 },
  logRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.textHeading,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  logBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logBtnLabel: { color: "#111", fontWeight: "700" },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
});
