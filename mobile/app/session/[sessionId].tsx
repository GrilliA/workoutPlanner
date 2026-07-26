import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  abandonSession,
  completeSession,
  getExercisesByWorkout,
  getSession,
  getWorkout,
  getWorkoutDayExercises,
  type Exercise,
  type LogSetInput,
  type LoggedSet,
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
  getTargetRepsForSet,
  getTargetSetCount,
  isExerciseComplete,
  resolveLogDefaults,
} from "../../src/features/session/logDefaults";
import {
  computeDurationMin,
  computeVolumeKg,
} from "../../src/features/session/celebrationStats";
import { RestTimerCard } from "../../src/features/session/RestTimerCard";
import { SessionActionBar } from "../../src/features/session/SessionActionBar";
import { useRestTimer } from "../../src/features/session/useRestTimer";
import { colors, spacing } from "../../src/theme";

let nextLocalSetId = -1;

function createLocalLoggedSet(
  sessionId: number,
  exerciseId: number,
  setNumber: number,
  reps: number,
  weightKg: number | null,
): LoggedSet {
  const id = nextLocalSetId;
  nextLocalSetId -= 1;

  return {
    id,
    sessionId,
    exerciseId,
    setNumber,
    reps,
    weightKg,
    rir: null,
    tutSec: null,
    loggedAt: new Date(),
  };
}

function toCompleteSetsPayload(sets: LoggedSet[]): LogSetInput[] {
  return sets.map((set) => ({
    exerciseId: set.exerciseId,
    setNumber: set.setNumber,
    reps: set.reps,
    weightKg: set.weightKg,
    rir: set.rir,
    tutSec: set.tutSec,
  }));
}

function toLoggingKey(exerciseId: number, setNumber: number): string {
  return `${exerciseId}:${setNumber}`;
}

export default function SessionScreen() {
  const { sessionId: rawId } = useLocalSearchParams<{ sessionId: string }>();
  const sessionId = Number(rawId);
  const [session, setSession] = useState<WorkoutSessionWithSets | null>(null);
  const [localSets, setLocalSets] = useState<LoggedSet[]>([]);
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
  const loggedKeysRef = useRef(new Set<string>());
  const loggingLockRef = useRef(false);
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

        loggedKeysRef.current = new Set();

        const setsForDefaults =
          nextSession.status === "in_progress" ? [] : nextSession.sets;
        const grouped = groupSetsByExercise(setsForDefaults);
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
        // Active: buffer in memory. Recap/read-only: show persisted sets.
        setLocalSets(
          nextSession.status === "in_progress" ? [] : nextSession.sets,
        );
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
  const setsByExercise = groupSetsByExercise(localSets);

  const onLogSet = (exercise: Exercise) => {
    if (session.status !== "in_progress" || loggingLockRef.current) {
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

    const repsRaw = repsByExercise[exercise.id]?.trim() ?? "";
    const reps =
      repsRaw === ""
        ? getTargetRepsForSet(exercise, setNumber)
        : Number(repsRaw);
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

    const key = toLoggingKey(exercise.id, setNumber);
    if (loggedKeysRef.current.has(key)) {
      return;
    }

    setError(null);
    loggingLockRef.current = true;
    loggedKeysRef.current.add(key);

    setLocalSets((current) => [
      ...current,
      createLocalLoggedSet(
        session.id,
        exercise.id,
        setNumber,
        reps,
        weightKg,
      ),
    ]);

    setWeightByExercise((current) => ({
      ...current,
      [exercise.id]: weightKg === null ? "" : formatWeightKg(weightKg),
    }));
    setRepsByExercise((current) => ({
      ...current,
      [exercise.id]: String(getTargetRepsForSet(exercise, setNumber + 1)),
    }));

    const restSec = getRestSecForSet(exercise, setNumber, defaultRestSec);
    if (
      restSec > 0 &&
      !isExerciseComplete(exercise, loggedForExercise.length + 1)
    ) {
      void timer.start(restSec, exercise.id).catch(() => {
        // Notifiche possono fallire (permessi): il set resta in buffer locale.
      });
    }

    queueMicrotask(() => {
      loggingLockRef.current = false;
    });
  };

  const onUndoLastSet = (exercise: Exercise) => {
    if (session.status !== "in_progress") {
      return;
    }

    const loggedForExercise = setsByExercise.get(exercise.id) ?? [];
    const last = loggedForExercise.at(-1);
    if (!last) {
      return;
    }

    timer.cancel();
    loggedKeysRef.current.delete(toLoggingKey(exercise.id, last.setNumber));

    setLocalSets((current) =>
      current.filter(
        (set) =>
          !(set.exerciseId === exercise.id && set.setNumber === last.setNumber),
      ),
    );

    setWeightByExercise((current) => ({
      ...current,
      [exercise.id]:
        last.weightKg === null ? "" : formatWeightKg(last.weightKg),
    }));
    setRepsByExercise((current) => ({
      ...current,
      [exercise.id]: String(last.reps),
    }));
    setError(null);
  };

  const onEditSet = (
    exercise: Exercise,
    setNumber: number,
    next: { reps: number; weightKg: number | null },
  ) => {
    if (session.status !== "in_progress") {
      return;
    }

    setLocalSets((current) =>
      current.map((set) =>
        set.exerciseId === exercise.id && set.setNumber === setNumber
          ? { ...set, reps: next.reps, weightKg: next.weightKg }
          : set,
      ),
    );

    const loggedForExercise = setsByExercise.get(exercise.id) ?? [];
    const isLast =
      loggedForExercise.length > 0 &&
      loggedForExercise[loggedForExercise.length - 1]?.setNumber === setNumber;

    if (isLast) {
      setWeightByExercise((current) => ({
        ...current,
        [exercise.id]:
          next.weightKg === null ? "" : formatWeightKg(next.weightKg),
      }));
      setRepsByExercise((current) => ({
        ...current,
        [exercise.id]: String(getTargetRepsForSet(exercise, setNumber + 1)),
      }));
    }

    setError(null);
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
        const completedAt = new Date();
        await completeSession(session.id, toCompleteSetsPayload(localSets));
        router.replace({
          pathname: "/session/complete",
          params: {
            workoutName,
            volumeKg: String(computeVolumeKg(localSets)),
            durationMin: String(
              computeDurationMin(session.startedAt, completedAt),
            ),
          },
        } as unknown as Href);
        return;
      }

      await abandonSession(session.id);
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
            {readOnly
              ? session.status === "completed"
                ? "Sessione completata"
                : "Sessione abbandonata"
              : "Sessione in corso"}
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
                onLogSet(exercise);
              }}
              onUndoLast={() => {
                onUndoLastSet(exercise);
              }}
              onEditSet={(setNumber, next) => {
                onEditSet(exercise, setNumber, next);
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
