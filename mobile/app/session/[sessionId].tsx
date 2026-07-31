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
  BackHeader,
  ErrorBanner,
  LoadingBlock,
  Screen,
} from "../../src/components";
import { ExerciseCard } from "../../src/features/session/ExerciseCard";
import { ExercisePager } from "../../src/features/session/ExercisePager";
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
import { SessionFocusHeader } from "../../src/features/session/SessionFocusHeader";
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

function formatElapsed(startedAt: Date, nowMs: number): string {
  const totalSec = Math.max(0, Math.floor((nowMs - startedAt.getTime()) / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function firstIncompleteIndex(
  exercises: Exercise[],
  setsByExercise: Map<number, LoggedSet[]>,
): number {
  const index = exercises.findIndex(
    (exercise) =>
      !isExerciseComplete(exercise, (setsByExercise.get(exercise.id) ?? []).length),
  );
  return index >= 0 ? index : 0;
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
  const [focusIndex, setFocusIndex] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
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
        setLocalSets(
          nextSession.status === "in_progress" ? [] : nextSession.sets,
        );
        setExercises(nextExercises);
        setWorkoutName(workout.name);
        setDefaultRestSec(workout.defaultRestSec);
        setWeightByExercise(nextWeights);
        setRepsByExercise(nextReps);
        setFocusIndex(
          firstIncompleteIndex(
            nextExercises,
            groupSetsByExercise(
              nextSession.status === "in_progress" ? [] : nextSession.sets,
            ),
          ),
        );
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

  useEffect(() => {
    if (!session || session.status !== "in_progress") {
      return;
    }

    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session]);

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
  const safeFocusIndex = Math.min(
    focusIndex,
    Math.max(0, exercises.length - 1),
  );
  const focusedExercise = exercises[safeFocusIndex] ?? null;
  const elapsedLabel = formatElapsed(session.startedAt, nowMs);
  const statusLabel = readOnly
    ? session.status === "completed"
      ? "Sessione completata"
      : "Sessione abbandonata"
    : "Sessione in corso";

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

    const nextLoggedCount = loggedForExercise.length + 1;

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
    const exerciseDone = isExerciseComplete(exercise, nextLoggedCount);

    if (restSec > 0 && !exerciseDone) {
      void timer.start(restSec, exercise.id).catch(() => {
        // Notifiche possono fallire (permessi): il set resta in buffer locale.
      });
    }

    if (exerciseDone) {
      const nextIndex = exercises.findIndex(
        (item, index) =>
          index > safeFocusIndex &&
          !isExerciseComplete(
            item,
            (setsByExercise.get(item.id) ?? []).length +
              (item.id === exercise.id ? 1 : 0),
          ),
      );
      if (nextIndex >= 0) {
        setFocusIndex(nextIndex);
      }
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
          <SessionFocusHeader
            workoutName={workoutName}
            exerciseIndex={safeFocusIndex}
            exerciseTotal={exercises.length}
            elapsedLabel={elapsedLabel}
            statusLabel={statusLabel}
          />

          {error ? <ErrorBanner message={error} /> : null}

          {readOnly ? (
            exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                sets={setsByExercise.get(exercise.id) ?? []}
                resting={false}
                readOnly
                weight={weightByExercise[exercise.id] ?? ""}
                reps={repsByExercise[exercise.id] ?? ""}
                onChangeWeight={() => undefined}
                onChangeReps={() => undefined}
                onLog={() => undefined}
                onUndoLast={() => undefined}
                onEditSet={() => undefined}
              />
            ))
          ) : focusedExercise ? (
            <>
              <ExerciseCard
                key={focusedExercise.id}
                exercise={focusedExercise}
                sets={setsByExercise.get(focusedExercise.id) ?? []}
                resting={timer.restingExerciseId === focusedExercise.id}
                readOnly={false}
                focus
                weight={weightByExercise[focusedExercise.id] ?? ""}
                reps={repsByExercise[focusedExercise.id] ?? ""}
                onChangeWeight={(value) =>
                  setWeightByExercise((current) => ({
                    ...current,
                    [focusedExercise.id]: value,
                  }))
                }
                onChangeReps={(value) =>
                  setRepsByExercise((current) => ({
                    ...current,
                    [focusedExercise.id]: value,
                  }))
                }
                onLog={() => {
                  onLogSet(focusedExercise);
                }}
                onUndoLast={() => {
                  onUndoLastSet(focusedExercise);
                }}
                onEditSet={(setNumber, next) => {
                  onEditSet(focusedExercise, setNumber, next);
                }}
              />

              <RestTimerCard
                status={timer.status}
                remainingSec={timer.remainingSec}
                onSkip={timer.skip}
              />

              {exercises.length > 1 ? (
                <ExercisePager
                  index={safeFocusIndex}
                  total={exercises.length}
                  onPrev={() => setFocusIndex((current) => Math.max(0, current - 1))}
                  onNext={() =>
                    setFocusIndex((current) =>
                      Math.min(exercises.length - 1, current + 1),
                    )
                  }
                />
              ) : null}
            </>
          ) : (
            <ErrorBanner message="Nessun esercizio in questa sessione" />
          )}
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
